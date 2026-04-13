import type {
  YouTubeSearchResponse,
  YouTubeChannelResponse,
  YouTubeChannelItem,
  YouTubeVideoResponse,
  YouTubeVideoItem,
} from './types'

const API_KEY = process.env.YOUTUBE_DATA_API_KEY!
const BASE_URL = 'https://www.googleapis.com/youtube/v3'

async function fetchYouTube<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  url.searchParams.set('key', API_KEY)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${errorBody}`)
  }
  return res.json()
}

// Limiteur de concurrence pour éviter les rate limits
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number
): Promise<(T | null)[]> {
  const results: (T | null)[] = new Array(tasks.length).fill(null)
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const i = index++
      try {
        results[i] = await tasks[i]()
      } catch {
        results[i] = null
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, tasks.length) }, worker)
  await Promise.all(workers)
  return results
}

export async function searchChannels(query: string, maxResults = 25, pageToken?: string): Promise<YouTubeSearchResponse> {
  const params: Record<string, string> = {
    part: 'snippet',
    type: 'channel',
    q: query,
    maxResults: maxResults.toString(),
    order: 'relevance',
  }
  if (pageToken) params.pageToken = pageToken
  return fetchYouTube<YouTubeSearchResponse>('search', params)
}

/**
 * Recherche multi-stratégie : 2 requêtes parallèles pour maximiser les résultats.
 * Fallback sur une requête simple si les deux échouent.
 */
export async function multiSearchChannelsByVideos(
  query: string,
  regionCode?: string
): Promise<string[]> {
  const channelIdSet = new Set<string>()

  // Stratégie 1 : pertinence (avec regionCode si fourni)
  const params1: Record<string, string> = {
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: '50',
    order: 'relevance',
  }
  if (regionCode) params1.regionCode = regionCode

  // Stratégie 2 : popularité sans regionCode (attrape les chaînes sans pays renseigné)
  const params2: Record<string, string> = {
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: '50',
    order: 'viewCount',
  }

  const [res1, res2] = await Promise.allSettled([
    fetchYouTube<YouTubeSearchResponse>('search', params1),
    fetchYouTube<YouTubeSearchResponse>('search', params2),
  ])

  if (res1.status === 'fulfilled') {
    for (const item of res1.value.items || []) {
      const cid = item.snippet?.channelId
      if (cid) channelIdSet.add(cid)
    }
  } else {
    console.error('[YouTube] Stratégie 1 échouée:', res1.reason)
  }

  if (res2.status === 'fulfilled') {
    for (const item of res2.value.items || []) {
      const cid = item.snippet?.channelId
      if (cid) channelIdSet.add(cid)
    }
  } else {
    console.error('[YouTube] Stratégie 2 échouée:', res2.reason)
  }

  // Si les deux ont échoué, tenter un fallback simple
  if (channelIdSet.size === 0) {
    console.warn('[YouTube] Les 2 stratégies ont échoué, tentative fallback...')
    try {
      const fallback = await fetchYouTube<YouTubeSearchResponse>('search', {
        part: 'snippet',
        type: 'video',
        q: query,
        maxResults: '25',
        order: 'relevance',
      })
      for (const item of fallback.items || []) {
        const cid = item.snippet?.channelId
        if (cid) channelIdSet.add(cid)
      }
    } catch (e) {
      console.error('[YouTube] Fallback aussi échoué:', e)
    }
  }

  console.log(`[YouTube] multiSearch "${query}" → ${channelIdSet.size} chaînes uniques`)
  return Array.from(channelIdSet)
}

// Recherche simple et fiable — 1 seul appel API (100 unités)
export async function searchChannelsByVideos(
  query: string,
  maxResults = 50,
  regionCode?: string
): Promise<string[]> {
  const params: Record<string, string> = {
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: maxResults.toString(),
    order: 'relevance',
  }
  if (regionCode) params.regionCode = regionCode

  const data = await fetchYouTube<YouTubeSearchResponse>('search', params)
  const channelIds = [...new Set(
    (data.items || [])
      .map(item => item.snippet?.channelId)
      .filter((id): id is string => !!id)
  )]
  return channelIds
}

export async function getChannelDetails(channelIds: string[]): Promise<YouTubeChannelItem[]> {
  const chunks: string[][] = []
  for (let i = 0; i < channelIds.length; i += 50) {
    chunks.push(channelIds.slice(i, i + 50))
  }

  const allItems: YouTubeChannelItem[] = []
  for (const chunk of chunks) {
    const data = await fetchYouTube<YouTubeChannelResponse>('channels', {
      part: 'snippet,statistics,brandingSettings,contentDetails',
      id: chunk.join(','),
    })
    allItems.push(...(data.items || []))
  }
  return allItems
}

export async function getChannelByHandle(handle: string): Promise<YouTubeChannelItem | null> {
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`
  const data = await fetchYouTube<YouTubeChannelResponse>('channels', {
    part: 'snippet,statistics,brandingSettings,contentDetails',
    forHandle: cleanHandle,
  })
  return data.items?.[0] || null
}

export async function getChannelById(channelId: string): Promise<YouTubeChannelItem | null> {
  const data = await fetchYouTube<YouTubeChannelResponse>('channels', {
    part: 'snippet,statistics,brandingSettings,contentDetails',
    id: channelId,
  })
  return data.items?.[0] || null
}

/**
 * Récupère les vidéos récentes via la playlist "uploads".
 * BEAUCOUP moins coûteux : 2 unités au lieu de 101.
 * (playlistItems = 1 unité, videos = 1 unité pour jusqu'à 50 IDs)
 */
export async function getRecentVideosViaPlaylist(
  uploadsPlaylistId: string,
  maxResults = 10
): Promise<YouTubeVideoItem[]> {
  const playlistData = await fetchYouTube<{
    items?: Array<{ contentDetails?: { videoId?: string } }>
  }>('playlistItems', {
    part: 'contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: maxResults.toString(),
  })

  const videoIds = (playlistData.items || [])
    .map(item => item.contentDetails?.videoId)
    .filter((id): id is string => !!id)

  if (!videoIds.length) return []

  const videoData = await fetchYouTube<YouTubeVideoResponse>('videos', {
    part: 'snippet,statistics,contentDetails',
    id: videoIds.join(','),
  })

  return videoData.items || []
}

/**
 * Récupère les vidéos pour plusieurs chaînes en parallèle (concurrence limitée à 5).
 * Utilise la playlist uploads si disponible pour économiser le quota.
 */
export async function getRecentVideosForChannels(
  channels: Array<{ channelId: string; uploadsPlaylistId?: string }>,
  maxResults = 10,
  maxConcurrent = 5
): Promise<Map<string, YouTubeVideoItem[]>> {
  const resultsMap = new Map<string, YouTubeVideoItem[]>()

  const tasks = channels.map(({ channelId, uploadsPlaylistId }) => async () => {
    let videos: YouTubeVideoItem[]
    if (uploadsPlaylistId) {
      videos = await getRecentVideosViaPlaylist(uploadsPlaylistId, maxResults)
    } else {
      videos = await getRecentVideos(channelId, maxResults)
    }
    return { channelId, videos }
  })

  const fetched = await runWithConcurrency(tasks, maxConcurrent)
  for (const result of fetched) {
    if (result) resultsMap.set(result.channelId, result.videos)
  }

  return resultsMap
}

export async function getRecentVideos(channelId: string, maxResults = 10): Promise<YouTubeVideoItem[]> {
  const searchData = await fetchYouTube<YouTubeSearchResponse>('search', {
    part: 'snippet',
    channelId,
    type: 'video',
    order: 'date',
    maxResults: maxResults.toString(),
  })

  if (!searchData.items?.length) return []

  const videoIds = searchData.items.map(item => item.id.videoId!).filter(Boolean)
  if (!videoIds.length) return []

  const videoData = await fetchYouTube<YouTubeVideoResponse>('videos', {
    part: 'snippet,statistics,contentDetails',
    id: videoIds.join(','),
  })

  return videoData.items || []
}

export async function getVideoDetails(videoIds: string[]): Promise<YouTubeVideoItem[]> {
  const chunks: string[][] = []
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50))
  }

  const allItems: YouTubeVideoItem[] = []
  for (const chunk of chunks) {
    const data = await fetchYouTube<YouTubeVideoResponse>('videos', {
      part: 'snippet,statistics,contentDetails',
      id: chunk.join(','),
    })
    allItems.push(...(data.items || []))
  }
  return allItems
}

export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 3600 + minutes * 60 + seconds
}

export function computeAvgViews(videos: YouTubeVideoItem[]): number {
  if (!videos.length) return 0
  const totalViews = videos.reduce((sum, v) => sum + parseInt(v.statistics?.viewCount || '0'), 0)
  return Math.round(totalViews / videos.length)
}

export function computeUploadFrequency(videos: YouTubeVideoItem[]): number {
  if (videos.length < 2) return 30
  const dates = videos
    .map(v => new Date(v.snippet.publishedAt).getTime())
    .sort((a, b) => b - a)

  const totalDays = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24)
  return Math.round((totalDays / (dates.length - 1)) * 10) / 10
}

export function detectNiche(description: string, videoTitles: string[]): string {
  const text = `${description} ${videoTitles.join(' ')}`.toLowerCase()

  const nicheKeywords: Record<string, string[]> = {
    gaming: ['gaming', 'gameplay', 'game', 'playthrough', 'lets play', 'fortnite', 'minecraft', 'gta', 'valorant'],
    tech: ['tech', 'technology', 'smartphone', 'iphone', 'android', 'laptop', 'review', 'unboxing', 'gadget', 'pc'],
    business: ['business', 'entrepreneur', 'startup', 'entreprise', 'management', 'e-commerce'],
    finance: ['finance', 'money', 'invest', 'trading', 'stock', 'argent', 'bourse', 'investir'],
    crypto: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'nft', 'defi', 'web3'],
    lifestyle: ['lifestyle', 'daily', 'routine', 'life', 'day in'],
    fitness: ['fitness', 'workout', 'gym', 'exercise', 'musculation', 'sport', 'training'],
    cooking: ['cooking', 'recipe', 'food', 'cuisine', 'recette', 'kitchen', 'chef', 'meal'],
    travel: ['travel', 'voyage', 'trip', 'explore', 'destination', 'backpack'],
    education: ['education', 'learn', 'tutorial', 'course', 'formation', 'apprendre', 'how to'],
    entertainment: ['entertainment', 'funny', 'comedy', 'prank', 'challenge', 'reaction'],
    music: ['music', 'song', 'album', 'beat', 'producer', 'musique', 'rap', 'cover'],
    beauty: ['beauty', 'makeup', 'skincare', 'cosmetic', 'maquillage', 'soin'],
    fashion: ['fashion', 'style', 'outfit', 'clothing', 'mode', 'look'],
    sports: ['football', 'soccer', 'basketball', 'nba', 'ufc', 'boxing', 'tennis'],
    real_estate: ['real estate', 'immobilier', 'property', 'house', 'apartment', 'maison'],
    marketing: ['marketing', 'seo', 'social media', 'digital marketing', 'ads'],
    coaching: ['coaching', 'mindset', 'motivation', 'personal development', 'développement personnel'],
    photography: ['photography', 'photo', 'camera', 'lightroom', 'photoshop'],
    art: ['art', 'drawing', 'painting', 'illustration', 'design', 'digital art'],
    diy: ['diy', 'craft', 'handmade', 'bricolage', 'maker'],
    automotive: ['car', 'auto', 'voiture', 'automotive', 'moto', 'vehicle'],
    health: ['health', 'santé', 'medical', 'wellness', 'bien-être'],
    motivation: ['motivation', 'success', 'hustle', 'grind', 'inspiration'],
    science: ['science', 'physics', 'biology', 'chemistry', 'space', 'espace'],
    news: ['news', 'actualité', 'politique', 'économie', 'journal'],
  }

  let bestNiche = 'other'
  let bestCount = 0

  for (const [niche, keywords] of Object.entries(nicheKeywords)) {
    const count = keywords.reduce((sum, kw) => {
      return sum + (text.includes(kw) ? 1 : 0)
    }, 0)
    if (count > bestCount) {
      bestCount = count
      bestNiche = niche
    }
  }

  return bestCount >= 1 ? bestNiche : 'other'
}
