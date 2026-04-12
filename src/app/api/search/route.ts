import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants'
import { computeProspectScore } from '@/lib/scoring'
import {
  searchChannels,
  getChannelDetails,
  getRecentVideos,
  computeAvgViews,
  computeUploadFrequency,
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

    // Check search limit for free plan
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

    // Search YouTube for channels
    const searchResponse = await searchChannels(query.trim(), 25)
    const channelIds = (searchResponse.items || [])
      .map(item => item.snippet?.channelId || item.id?.channelId)
      .filter(Boolean) as string[]

    if (!channelIds.length) {
      return NextResponse.json({ channels: [], total: 0 })
    }

    // Get detailed channel info (batch request)
    const channelDetails = await getChannelDetails(channelIds)

    // Process each channel
    const processedChannels = await Promise.all(
      channelDetails.map(async (ch) => {
        const subscriberCount = parseInt(ch.statistics?.subscriberCount || '0')
        const viewCount = parseInt(ch.statistics?.viewCount || '0')
        const videoCount = parseInt(ch.statistics?.videoCount || '0')

        // Apply subscriber filter early to avoid unnecessary API calls
        if (filters.minSubscribers && subscriberCount < filters.minSubscribers) return null
        if (filters.maxSubscribers && subscriberCount > filters.maxSubscribers) return null

        // Check cache first
        const { data: cached } = await supabase
          .from('channels')
          .select('*')
          .eq('youtube_channel_id', ch.id)
          .single()

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const isFresh = cached && cached.last_synced_at > sevenDaysAgo

        let avgViews = cached?.avg_views_last_10 ?? null
        let uploadFrequency = cached?.upload_frequency_days ?? null
        let nicheCategory = cached?.niche_category ?? null

        // Fetch videos if cache is stale or missing
        if (!isFresh) {
          try {
            const videos = await getRecentVideos(ch.id, 10)
            avgViews = computeAvgViews(videos)
            uploadFrequency = computeUploadFrequency(videos)
            nicheCategory = detectNiche(
              ch.snippet.description || '',
              videos.map(v => v.snippet.title)
            )

            // Cache videos
            if (videos.length > 0) {
              const { data: channelRow } = await supabase
                .from('channels')
                .select('id')
                .eq('youtube_channel_id', ch.id)
                .single()

              if (channelRow) {
                const videoRows = videos.map(v => ({
                  channel_id: channelRow.id,
                  youtube_video_id: v.id,
                  title: v.snippet.title,
                  thumbnail_url: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url,
                  thumbnail_maxres_url: v.snippet.thumbnails?.maxres?.url,
                  view_count: parseInt(v.statistics?.viewCount || '0'),
                  like_count: parseInt(v.statistics?.likeCount || '0'),
                  comment_count: parseInt(v.statistics?.commentCount || '0'),
                  published_at: v.snippet.publishedAt,
                }))
                await supabase.from('channel_videos').upsert(videoRows, { onConflict: 'youtube_video_id' })
              }
            }
          } catch {
            // Use defaults if video fetch fails
            avgViews = avgViews ?? 0
            uploadFrequency = uploadFrequency ?? 30
            nicheCategory = nicheCategory ?? 'other'
          }
        }

        // Apply more filters
        if (filters.minAvgViews && (avgViews ?? 0) < filters.minAvgViews) return null
        if (filters.maxAvgViews && (avgViews ?? 0) > filters.maxAvgViews) return null
        // Niche filter: soft match (don't filter if niche is 'other' or undetected)
        if (filters.niche && nicheCategory && nicheCategory !== 'other' && nicheCategory !== filters.niche) return null
        // Country filter: soft match (don't filter if channel has no country set)
        if (filters.country && ch.snippet.country && ch.snippet.country !== filters.country) return null

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

        // Upsert channel into cache
        const { data: upserted } = await supabase
          .from('channels')
          .upsert(channelData, { onConflict: 'youtube_channel_id' })
          .select()
          .single()

        const fullChannel = { ...(upserted || channelData), id: upserted?.id || cached?.id }

        // Compute prospect score
        const score = computeProspectScore(fullChannel as Parameters<typeof computeProspectScore>[0])

        return { ...fullChannel, prospect_score: score.total, scoreDetails: score }
      })
    )

    // Filter nulls
    const validChannels = processedChannels.filter(Boolean)

    // Save search record
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

    // Save search results
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

    // Increment search counter
    await supabase
      .from('profiles')
      .update({ total_searches_used: profile.total_searches_used + 1 })
      .eq('id', user.id)

    // Apply visibility limit for free plan
    const visibleCount = plan.visibleResults
    const channels = validChannels.slice(0, 50).map((ch, index) => ({
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
