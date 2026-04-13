import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants'
import { computeProspectScore } from '@/lib/scoring'
import {
  multiSearchChannelsByVideos,
  getChannelDetails,
  detectNiche,
} from '@/lib/youtube/client'
import type { SearchFilters } from '@/types'

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

    // Vérifier la limite de recherches
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

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Requête vide' }, { status: 400 })
    }

    // Mapper le code pays vers regionCode YouTube
    const countryToRegion: Record<string, string> = {
      FR: 'FR', BE: 'BE', CA: 'CA', CH: 'CH', LU: 'LU',
      MA: 'MA', TN: 'TN', DZ: 'DZ', SN: 'SN',
    }
    const regionCode = filters.country ? countryToRegion[filters.country] : undefined

    console.log(`[Search] query="${query}" regionCode=${regionCode}`)

    // Recherche multi-stratégie : 2 requêtes parallèles → ~60-80 chaînes uniques
    const channelIds = await multiSearchChannelsByVideos(query.trim(), regionCode)
    console.log(`[Search] ${channelIds.length} channelIds trouvés`)

    if (!channelIds.length) {
      console.warn('[Search] Aucun channelId trouvé — quota YouTube dépassé ou clé invalide ?')
      return NextResponse.json({ channels: [], total: 0 })
    }

    // Récupérer les détails de toutes les chaînes en batch (très rapide : 1-2 appels API)
    const channelDetails = await getChannelDetails(channelIds)
    console.log(`[Search] ${channelDetails.length} chaînes avec détails`)

    // Appliquer les filtres d'abonnés
    const filteredDetails = channelDetails.filter(ch => {
      const subs = parseInt(ch.statistics?.subscriberCount || '0')
      if (filters.minSubscribers && subs < filters.minSubscribers) return false
      if (filters.maxSubscribers && subs > filters.maxSubscribers) return false
      return true
    })
    console.log(`[Search] ${filteredDetails.length} chaînes après filtre abonnés`)

    if (!filteredDetails.length) {
      return NextResponse.json({ channels: [], total: 0 })
    }

    // Vérifier le cache Supabase
    const { data: cachedChannels } = await supabase
      .from('channels')
      .select('*')
      .in('youtube_channel_id', filteredDetails.map(ch => ch.id))

    const cacheMap = new Map((cachedChannels || []).map(c => [c.youtube_channel_id, c]))

    // Traiter chaque chaîne SANS appel API vidéo pendant la recherche
    // → beaucoup plus rapide. Les vidéos sont chargées à la demande dans le panneau détail.
    const processedChannels = await Promise.all(
      filteredDetails.map(async (ch) => {
        const subscriberCount = parseInt(ch.statistics?.subscriberCount || '0')
        const viewCount = parseInt(ch.statistics?.viewCount || '0')
        const videoCount = parseInt(ch.statistics?.videoCount || '0')

        const cached = cacheMap.get(ch.id)

        // Réutiliser le cache si dispo, sinon estimer depuis les stats globales
        const avgViews = cached?.avg_views_last_10 ??
          (videoCount > 0 ? Math.round(viewCount / videoCount) : 0)
        const uploadFrequency = cached?.upload_frequency_days ?? null
        const nicheCategory = cached?.niche_category ??
          detectNiche(ch.snippet.description || '', [])

        // Filtre vues moyennes
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

        // Upsert dans le cache (sans écraser les données vidéo existantes)
        const { data: upserted } = await supabase
          .from('channels')
          .upsert(channelData, { onConflict: 'youtube_channel_id' })
          .select()
          .single()

        const fullChannel = { ...(upserted || channelData), id: upserted?.id || cached?.id }

        // Score prospect
        const score = computeProspectScore(fullChannel as Parameters<typeof computeProspectScore>[0])

        return { ...fullChannel, prospect_score: score.total, scoreDetails: score }
      })
    )

    // Filtrer les nulls et trier par score
    const validChannels = processedChannels
      .filter(Boolean)
      .sort((a, b) => (b!.prospect_score ?? 0) - (a!.prospect_score ?? 0))

    // Enregistrer la recherche (fire and forget pour ne pas ralentir la réponse)
    supabase
      .from('searches')
      .insert({
        user_id: user.id,
        query_text: query.trim(),
        filters,
        total_results: validChannels.length,
      })
      .then(() => {})

    // Incrémenter le compteur de recherches
    supabase
      .from('profiles')
      .update({ total_searches_used: profile.total_searches_used + 1 })
      .eq('id', user.id)
      .then(() => {})

    // Appliquer la limite de visibilité selon le plan
    const visibleCount = plan.visibleResults
    const channels = validChannels.slice(0, 100).map((ch, index) => ({
      ...ch,
      isBlurred: index >= visibleCount,
    }))

    return NextResponse.json({
      channels,
      total: validChannels.length,
      searchesRemaining:
        plan.maxSearchesLifetime === Infinity
          ? null
          : plan.maxSearchesLifetime - profile.total_searches_used - 1,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Erreur lors de la recherche' }, { status: 500 })
  }
}
