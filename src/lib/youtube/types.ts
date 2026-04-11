export interface YouTubeSearchResponse {
  kind: string
  etag: string
  nextPageToken?: string
  pageInfo: { totalResults: number; resultsPerPage: number }
  items: YouTubeSearchItem[]
}

export interface YouTubeSearchItem {
  kind: string
  etag: string
  id: { kind: string; channelId?: string; videoId?: string }
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default: YouTubeThumbnail
      medium: YouTubeThumbnail
      high: YouTubeThumbnail
    }
    channelTitle: string
  }
}

export interface YouTubeThumbnail {
  url: string
  width?: number
  height?: number
}

export interface YouTubeChannelResponse {
  items: YouTubeChannelItem[]
}

export interface YouTubeChannelItem {
  id: string
  snippet: {
    title: string
    description: string
    customUrl?: string
    publishedAt: string
    thumbnails: {
      default: YouTubeThumbnail
      medium: YouTubeThumbnail
      high: YouTubeThumbnail
    }
    country?: string
    defaultLanguage?: string
  }
  statistics: {
    viewCount: string
    subscriberCount: string
    hiddenSubscriberCount: boolean
    videoCount: string
  }
  brandingSettings?: {
    channel: {
      title: string
      description?: string
      keywords?: string
      country?: string
    }
    image?: {
      bannerExternalUrl?: string
    }
  }
  contentDetails?: {
    relatedPlaylists: {
      uploads: string
    }
  }
}

export interface YouTubeVideoResponse {
  items: YouTubeVideoItem[]
}

export interface YouTubeVideoItem {
  id: string
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default?: YouTubeThumbnail
      medium?: YouTubeThumbnail
      high?: YouTubeThumbnail
      standard?: YouTubeThumbnail
      maxres?: YouTubeThumbnail
    }
    channelTitle: string
    categoryId?: string
  }
  statistics?: {
    viewCount: string
    likeCount: string
    commentCount: string
  }
  contentDetails?: {
    duration: string
  }
}
