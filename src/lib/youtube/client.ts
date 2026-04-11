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
