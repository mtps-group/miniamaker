import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRecentVideos, getChannelById } from '@/lib/youtube/client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { channelId } = await params

    // Check cache first
    const { data: channel } = await supabase
      .from('channels')
      .select('id')
      .eq('youtube_channel_id', channelId)
      .single()

    if (channel) {
      const { data: videos } = await supabase
        .from('channel_videos')
        .select('*')
        .eq('channel_id', channel.id)
        .order('published_at', { ascending: false })
        .limit(12)

      if (videos && videos.length > 0) {
        return NextResponse.json({ videos })
      }
    }

    // Fetch from YouTube API
    const videos = await getRecentVideos(channelId, 12)
    const mapped = videos.map(v => ({
      id: crypto.randomUUID(),
      channel_id: channel?.id || null,
      youtube_video_id: v.id,
      title: v.snippet.title,
      thumbnail_url: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || null,
      thumbnail_maxres_url: v.snippet.thumbnails?.maxres?.url || null,
      view_count: parseInt(v.statistics?.viewCount || '0'),
      like_count: parseInt(v.statistics?.likeCount || '0'),
      comment_count: parseInt(v.statistics?.commentCount || '0'),
      published_at: v.snippet.publishedAt,
      duration_seconds: null,
      thumbnail_analysis: null,
      thumbnail_score: null,
      created_at: new Date().toISOString(),
    }))

    return NextResponse.json({ videos: mapped })
  } catch (error) {
    console.error('Channel videos error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
