'use client'

import { useEffect, useState } from 'react'
import { X, Users, Eye, Video, Clock, Globe, UserPlus, Image, ExternalLink, Check, TrendingUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatNumber, getScoreLabel, getYouTubeThumbnailUrl } from '@/lib/utils'
import { NICHE_LABELS } from '@/lib/constants'
import type { Channel, ChannelVideo } from '@/types'

interface ChannelDetailPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: (Channel & { prospect_score?: number; scoreDetails?: any; isBlurred?: boolean }) | null
  isProspect?: boolean
  onClose: () => void
  onAddProspect: (channel: Channel) => Promise<void>
  onAnalyze: (channel: Channel) => void
}

const getScoreDark = (score: number) => {
  if (score >= 80) return 'text-red-400 border-red-500/30 bg-red-500/10'
  if (score >= 60) return 'text-orange-400 border-orange-500/30 bg-orange-500/10'
  if (score >= 40) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
  return 'text-gray-400 border-gray-500/30 bg-gray-500/10'
}

export default function ChannelDetailPanel({ channel, isProspect, onClose, onAddProspect, onAnalyze }: ChannelDetailPanelProps) {
  const [videos, setVideos] = useState<ChannelVideo[]>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(isProspect || false)

  useEffect(() => {
    if (!channel) return
    setAdded(isProspect || false)
    setVideos([])
    loadVideos(channel.youtube_channel_id)
  }, [channel?.id, isProspect])

  const loadVideos = async (channelId: string) => {
    setLoadingVideos(true)
    try {
      const res = await fetch(`/api/channel/${channelId}/videos`)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch {
      // ignore
    } finally {
      setLoadingVideos(false)
    }
  }

  const handleAddProspect = async () => {
    if (!channel || added || adding) return
    setAdding(true)
    try {
      await onAddProspect(channel)
      setAdded(true)
    } finally {
      setAdding(false)
    }
  }

  if (!channel) return null

  const score = channel.prospect_score ?? 0
  const scoreInfo = getScoreLabel(score)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-[#0d0d0d] border-l border-white/5 shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[#0d0d0d] border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-white">Détails de la chaîne</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Banner */}
        {channel.banner_url && (
          <div className="h-24 overflow-hidden">
            <img src={channel.banner_url} alt="" className="w-full h-full object-cover opacity-70" />
          </div>
        )}

        {/* Channel Info */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-start gap-4">
            <img
              src={channel.thumbnail_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.channel_name)}&background=dc2626&color=fff`}
              alt={channel.channel_name}
              className="w-16 h-16 rounded-xl border border-white/10 object-cover flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.channel_name)}&background=dc2626&color=fff` }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-lg truncate">{channel.channel_name}</h3>
              {channel.channel_handle && <p className="text-sm text-gray-500">{channel.channel_handle}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {channel.niche_category && (
                  <Badge variant="info" size="sm">{NICHE_LABELS[channel.niche_category] || channel.niche_category}</Badge>
                )}
                {channel.country && (
                  <Badge variant="default" size="sm">{channel.country}</Badge>
                )}
                {channel.published_at && (
                  <Badge variant="default" size="sm">Depuis {new Date(channel.published_at).getFullYear()}</Badge>
                )}
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-sm font-black border ${getScoreDark(score)}`}>
              {score}
            </div>
          </div>

          {channel.description && (
            <p className="mt-3 text-sm text-gray-500 line-clamp-3 leading-relaxed">{channel.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-white/5">
          {[
            { icon: <Users className="w-4 h-4 text-red-400" />, value: formatNumber(channel.subscriber_count), label: 'Abonnés' },
            { icon: <Eye className="w-4 h-4 text-blue-400" />, value: channel.avg_views_last_10 ? formatNumber(channel.avg_views_last_10) : '—', label: 'Vues moyennes' },
            { icon: <Video className="w-4 h-4 text-purple-400" />, value: formatNumber(channel.video_count), label: 'Vidéos publiées' },
            {
              icon: <Clock className="w-4 h-4 text-green-400" />,
              value: channel.upload_frequency_days
                ? channel.upload_frequency_days <= 7
                  ? `${Math.round(7 / channel.upload_frequency_days)}x/sem`
                  : `${Math.round(channel.upload_frequency_days)}j`
                : '—',
              label: 'Fréquence upload'
            },
          ].map((stat, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-xl p-3 text-center border border-white/5">
              <div className="flex items-center justify-center mb-1">{stat.icon}</div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Prospect Score Breakdown */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-400" /> Score prospect
            </h4>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getScoreDark(score)}`}>
              {score}/100 · {scoreInfo.label}
            </span>
          </div>
          {channel.scoreDetails?.details?.map((detail: { category: string; score: number; maxScore: number; label: string }) => (
            <div key={detail.category} className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-400">{detail.category}</span>
                <span className="font-medium text-gray-300">{detail.score}/{detail.maxScore}</span>
              </div>
              <ProgressBar value={detail.score} max={detail.maxScore} color="red" />
            </div>
          ))}
          {!channel.scoreDetails?.details && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">Score calculé automatiquement</p>
              <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-1000"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Recent Thumbnails */}
        <div className="px-5 py-4 flex-1">
          <h4 className="font-bold text-white mb-3">Miniatures récentes</h4>
          {loadingVideos ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {videos.slice(0, 8).map((video) => (
                <div key={video.id} className="group relative rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5">
                  <img
                    src={video.thumbnail_url || getYouTubeThumbnailUrl(video.youtube_video_id, 'mq')}
                    alt={video.title}
                    className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).src = getYouTubeThumbnailUrl(video.youtube_video_id, 'mq') }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                    <p className="text-white text-xs line-clamp-2 font-medium">{video.title}</p>
                  </div>
                  {video.view_count > 0 && (
                    <div className="absolute top-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded-md">
                      {formatNumber(video.view_count)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-[#1a1a1a] rounded-xl border border-white/5">
              <p className="text-sm text-gray-500">Aucune vidéo disponible</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-[#0d0d0d] border-t border-white/5 px-5 py-4 flex gap-3">
          <Button
            variant={added ? 'secondary' : 'primary'}
            className="flex-1"
            onClick={handleAddProspect}
            loading={adding}
            disabled={added}
          >
            {added ? <><Check className="w-4 h-4" /> Prospect ajouté</> : <><UserPlus className="w-4 h-4" /> Ajouter aux prospects</>}
          </Button>
          <Button variant="outline" onClick={() => onAnalyze(channel)} title="Analyser les miniatures">
            <Image className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => window.open(`https://youtube.com/channel/${channel.youtube_channel_id}`, '_blank')} title="Voir sur YouTube">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
