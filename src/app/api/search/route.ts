import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants'
import { computeProspectScore } from '@/lib/scoring'
import {
  searchChannelsByVideos,
  getChannelDetails,
  detectNiche,
} from '@/lib/youtube/client'
import type { SearchFilters } from '@/types'

// ─────────────────────────────────────────────
// STRATÉGIE DE CACHE
// ─────────────────────────────────────────────
// Chaque recherche unique (query + pays) n'appelle YouTube qu'UNE FOIS par 24h.
// Les résultats sont stockés dans Supabase et servis à tous les utilisateurs suivants.
// → 10 000 unités YouTube/jour = ~100 recherches UNIQUES (pas par utilisateur).
// ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const plan = PLANS[profile.plan as keyof typeof PLANS] || PLANS.free

    if (
      plan.maxSearchesLifetime !== Infinity &&
      profile.total_searches_used >= plan.maxSearchesLifetime
    ) {
      return NextResponse.json(
        { error: 'Limite de recherches atteinte', limitReached: true },
        { status: 403 }
      )
    }

    const { query, filters = {} as SearchFilters } = await request.json()
    if (!query?.trim()) return NextResponse.json({ error: 'Requête vide' }, { status: 400 })

    const normalizedQuery = query.trim().toLowerCase()
    const queryCountry = (filters.country as string | undefined) || null

    // ─── 1. VÉRIFIER LE CACHE (24h, partagé entre tous les utilisateurs) ───
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentSearches } = await supabase
      .from('searches')
      .select('id, total_results, filters')
      .ilike('query_text', normalizedQuery)
      .gte('created_at', oneDayAgo)
      .gt('total_results', 0)
      .order('created_at', { ascending: false })
      .limit(10)

    // Trouver un cache avec le même pays
    const cachedSearch = (recentSearches || []).find(s => {
      const cachedCountry = (s.filters as SearchFilters)?.country || null
      return cachedCountry === queryCountry
    })

    if (cachedSearch) {
      console.log(`[Search] Cache HIT pour "${normalizedQuery}" (id=${cachedSearch.id})`)

      // Récupérer les channels depuis le cache Supabase
      const { data: searchResultRows } = await supabase
        .from('search_results')
        .select('channel_id, position')
        .eq('search_id', cachedSearch.id)
        .order('position', { ascending: true })

      if (searchResultRows && searchResultRows.length > 0) {
        const channelDbIds = searchResultRows.map(r => r.channel_id).filter(Boolean)

        const { data: cachedChannelData } = await supabase
          .from('channels')
          .select('*')
          .in('id', channelDbIds)

        if (cachedChannelData && cachedChannelData.length > 0) {
          // Appliquer les filtres abonnés/vues en mémoire
          const filtered = cachedChannelData.filter(ch => {
            if (filters.minSubscribers && ch.subscriber_count < filters.minSubscribers) return false
            if (filters.maxSubscribers && ch.subscriber_count > filters.maxSubscribers) return false
            if (filters.minAvgViews && (ch.avg_views_last_10 || 0) < filters.minAvgViews) return false
            if (filters.maxAvgViews && (ch.avg_views_last_10 || 0) > filters.maxAvgViews) return false
            return true
          })

          // Calculer les scores et trier
          const scoredChannels = filtered
            .map(ch => {
              const score = computeProspectScore(ch as Parameters<typeof computeProspectScore>[0])
              return { ...ch, prospect_score: score.total, scoreDetails: score }
            })
            .sort((a, b) => b.prospect_score - a.prospect_score)

          // Enregistrer la recherche utilisateur + incrémenter compteur
          supabase.from('searches').insert({
            user_id: user.id,
            query_text: query.trim(),
            filters,
            total_results: scoredChannels.length,
          }).then(() => {})
          supabase.from('profiles').update({
            total_searches_used: profile.total_searches_used + 1,
          }).eq('id', user.id).then(() => {})

          const visibleCount = plan.visibleResults
          const channels = scoredChannels.slice(0, 100).map((ch, index) => ({
            ...ch,
            isBlurred: index >= visibleCount,
          }))

          return NextResponse.json({
            channels,
            total: scoredChannels.length,
            fromCache: true,
            searchesRemaining: plan.maxSearchesLifetime === Infinity
              ? null
              : plan.maxSearchesLifetime - profile.total_searches_used - 1,
          })
        }
      }
    }

    // ─── 2. CACHE MISS → APPEL YOUTUBE API (1 seul appel = 100 unités) ───
    console.log(`[Search] Cache MISS pour "${normalizedQuery}" — appel YouTube API...`)

    const countryToRegion: Record<string, string> = {
      FR: 'FR', BE: 'BE', CA: 'CA', CH: 'CH', LU: 'LU',
      MA: 'MA', TN: 'TN', DZ: 'DZ', SN: 'SN',
    }
    const regionCode = queryCountry ? countryToRegion[queryCountry] : undefined

    const channelIds = await searchChannelsByVideos(normalizedQuery, 50, regionCode)
    console.log(`[Search] ${channelIds.length} channelIds YouTube`)

    if (!channelIds.length) {
      return NextResponse.json({
        channels: [],
        total: 0,
        error: 'quotaExceeded',
      })
    }

    // Détails des chaînes (batch, 1 unité pour 50 IDs)
    const channelDetails = await getChannelDetails(channelIds)

    // Filtrer par abonnés
    const filteredDetails = channelDetails.filter(ch => {
      const subs = parseInt(ch.statistics?.subscriberCount || '0')
      if (filters.minSubscribers && subs < filters.minSubscribers) return false
      if (filters.maxSubscribers && subs > filters.maxSubscribers) return false
      return true
    })

    if (!filteredDetails.length) {
      return NextResponse.json({ channels: [], total: 0 })
    }

    // Récupérer le cache Supabase pour ne pas écraser les données vidéo existantes
    const { data: existingChannels } = await supabase
      .from('channels')
      .select('*')
      .in('youtube_channel_id', filteredDetails.map(ch => ch.id))
    const existingMap = new Map((existingChannels || []).map(c => [c.youtube_channel_id, c]))

    // Traiter chaque chaîne (sans appel API vidéo → ultra rapide)
    const processedChannels = await Promise.all(
      filteredDetails.map(async (ch) => {
        const subscriberCount = parseInt(ch.statistics?.subscriberCount || '0')
        const viewCount = parseInt(ch.statistics?.viewCount || '0')
        const videoCount = parseInt(ch.statistics?.videoCount || '0')
        const existing = existingMap.get(ch.id)

        const avgViews = existing?.avg_views_last_10 ??
          (videoCount > 0 ? Math.round(viewCount / videoCount) : 0)
        const uploadFrequency = existing?.upload_frequency_days ?? null
        const nicheCategory = existing?.niche_category ??
          detectNiche(ch.snippet.description || '', [])

        if (filters.minAvgViews && avgViews < filters.minAvgViews) return null
        if (filters.maxAvgViews && avgViews > filters.maxAvgViews) return null

        const channelData = {
          youtube_channel_id: ch.id,
          channel_name: ch.snippet.title,
          channel_handle: ch.snippet.customUrl ?? null,
          description: ch.snippet.description ?? null,
          thumbnail_url: ch.snippet.thumbnails?.high?.url ?? ch.snippet.thumbnails?.medium?.url ?? null,
          banner_url: ch.brandingSettings?.image?.bannerExternalUrl ?? null,
          country: ch.snippet.country ?? null,
          default_language: ch.snippet.defaultLanguage ?? null,
          subscriber_count: subscriberCount,
          video_count: videoCount,
          view_count: viewCount,
          custom_url: ch.snippet.customUrl ?? null,
          published_at: ch.snippet.publishedAt,
          avg_views_last_10: avgViews,
          upload_frequency_days: uploadFrequency,
          niche_category: nicheCategory,
          last_synced_at: new Date().toISOString(),
        }

        const { data: upserted } = await supabase
          .from('channels')
          .upsert(channelData, { onConflict: 'youtube_channel_id' })
          .select()
          .single()

        const fullChannel = { ...(upserted || channelData), id: upserted?.id || existing?.id }
        const score = computeProspectScore(fullChannel as Parameters<typeof computeProspectScore>[0])
        return { ...fullChannel, prospect_score: score.total, scoreDetails: score }
      })
    )

    const validChannels = processedChannels
      .filter(Boolean)
      .sort((a, b) => (b!.prospect_score ?? 0) - (a!.prospect_score ?? 0))

    // ─── 3. SAUVEGARDER POUR LE CACHE (utilisateurs futurs) ───
    const { data: searchRecord } = await supabase
      .from('searches')
      .insert({
        user_id: user.id,
        query_text: query.trim().toLowerCase(), // normalisé pour le cache
        filters,
        total_results: validChannels.length,
      })
      .select()
      .single()

    if (searchRecord && validChannels.length > 0) {
      const resultRows = validChannels
        .filter(ch => ch?.id)
        .map((ch, index) => ({
          search_id: searchRecord.id,
          user_id: user.id,
          channel_id: ch!.id,
          position: index,
        }))
      if (resultRows.length > 0) {
        await supabase.from('search_results').insert(resultRows)
      }
    }

    supabase.from('profiles').update({
      total_searches_used: profile.total_searches_used + 1,
    }).eq('id', user.id).then(() => {})

    const visibleCount = plan.visibleResults
    const channels = validChannels.slice(0, 100).map((ch, index) => ({
      ...ch,
      isBlurred: index >= visibleCount,
    }))

    return NextResponse.json({
      channels,
      total: validChannels.length,
      searchesRemaining: plan.maxSearchesLifetime === Infinity
        ? null
        : plan.maxSearchesLifetime - profile.total_searches_used - 1,
    })
  } catch (error) {
    console.error('[Search] Erreur:', error)
    return NextResponse.json({ error: 'Erreur lors de la recherche' }, { status: 500 })
  }
}
