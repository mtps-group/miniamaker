import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants'
import { computeProspectScore } from '@/lib/scoring'
import {
  multiSearchChannelsByVideos,
  getChannelDetails,
  getRecentVideosForChannels,
  computeAvgViews,
  computeUploadFrequency,
  detectNiche,
} from '@/lib/youtube/client'
import type { YouTubeVideoItem } from '@/lib/youtube/types'
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

    // Recherche multi-stratégie : 3 requêtes parallèles → ~80-100 chaînes uniques
    const channelIds = await multiSearchChannelsByVideos(query.trim(), regionCode)

    if (!channelIds.length) {
      return NextResponse.json({ channels: [], total: 0 })
    }

    // Récupérer les détails de toutes les chaînes en batch
    const channelDetails = await getChannelDetails(channelIds)

    // Appliquer les filtres d'abonnés en amont pour éviter les appels API inutiles
    const filteredDetails = channelDetails.filter(ch => {
      const subs = parseInt(ch.statistics?.subscriberCount || '0')
      if (filters.minSubscribers && subs < filters.minSubscribers) return false
      if (filters.maxSubscribers && subs > filters.maxSubscribers) return false
      return true
    })

    if (!filteredDetails.length) {
      return NextResponse.json({ channels: [], total: 0 })
    }

    // Vérifier le cache pour chaque chaîne
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: cachedChannels } = await supabase
      .from('channels')
      .select('*')
      .in('youtube_channel_id', filteredDetails.map(ch => ch.id))

    const cacheMap = new Map((cachedChannels || []).map(c => [c.youtube_channel_id, c]))

    // Identifier les chaînes qui ont besoin d'être mises à jour
    const channelsNeedingVideos = filteredDetails
      .filter(ch => {
        const cached = cacheMap.get(ch.id)
        return !cached || cached.last_synced_at < sevenDaysAgo
      })
      .map(ch => ({
        channelId: ch.id,
        // Playlist uploads = 2 unités de quota au lieu de 101 (search+videos)
        uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
      }))

    // Récupérer les vidéos en parallèle (concurrence limitée à 5)
    const videosMap = channelsNeedingVideos.length > 0
      ? await getRecentVideosForChannels(channelsNeedingVideos, 10, 5)
      : new Map()

    // Traiter chaque chaîne
    const processedChannels = await Promise.all(
      filteredDetails.map(async (ch) => {
        const subscriberCount = parseInt(ch.statistics?.subscriberCount || '0')
        const viewCount = parseInt(ch.statistics?.viewCount || '0')
        const videoCount = parseInt(ch.statistics?.videoCount || '0')

        const cached = cacheMap.get(ch.id)
        const isFresh = cached && cached.last_synced_at > sevenDaysAgo

        let avgViews = cached?.avg_views_last_10 ?? null
        let uploadFrequency = cached?.upload_frequency_days ?? null
        let nicheCategory = cached?.niche_category ?? null

        // Utiliser les vidéos récupérées en batch
        const videos = videosMap.get(ch.id)
        if (!isFresh && videos !== undefined) {
          avgViews = computeAvgViews(videos)
          uploadFrequency = computeUploadFrequency(videos)
          nicheCategory = detectNiche(
            ch.snippet.description || '',
            videos.map((v: YouTubeVideoItem) => v.snippet.title)
          )

          // Mettre en cache les vidéos (fire and forget)
          if (videos.length > 0 && cached?.id) {
            const videoRows = videos.map((v: YouTubeVideoItem) => ({
              channel_id: cached.id,
              youtube_video_id: v.id,
              title: v.snippet.title,
              thumbnail_url: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url,
              thumbnail_maxres_url: v.snippet.thumbnails?.maxres?.url,
              view_count: parseInt(v.statistics?.viewCount || '0'),
              like_count: parseInt(v.statistics?.likeCount || '0'),
              comment_count: parseInt(v.statistics?.commentCount || '0'),
              published_at: v.snippet.publishedAt,
            }))
            supabase
              .from('channel_videos')
              .upsert(videoRows, { onConflict: 'youtube_video_id' })
              .then(() => {})
          }
        } else if (!isFresh) {
          avgViews = avgViews ?? 0
          uploadFrequency = uploadFrequency ?? 30
          nicheCategory = nicheCategory ?? 'other'
        }

        // Filtre vues moyennes
        if (filters.minAvgViews && (avgViews ?? 0) < filters.minAvgViews) return null
        if (filters.maxAvgViews && (avgViews ?? 0) > filters.maxAvgViews) return null

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

        // Upsert dans le cache
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

    // Enregistrer la recherche
    const { data: searchRecord } = await supabase
      .from('searches')
      .insert({
        user_id: user.id,
        query_text: query.trim(),
        filters,
        total_results: validChannels.length,
      })
      .select()
      .single()

    // Enregistrer les résultats
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

    // Incrémenter le compteur de recherches
    await supabase
      .from('profiles')
      .update({ total_searches_used: profile.total_searches_used + 1 })
      .eq('id', user.id)

    // Appliquer la limite de visibilité selon le plan
    const visibleCount = plan.visibleResults
    const channels = validChannels.slice(0, 100).map((ch, index) => ({
      ...ch,
      isBlurred: index >= visibleCount,
    }))

    return NextResponse.json({
      channels,
      total: validChannels.length,
      searchId: searchRecord?.id,
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
