'use client'

import { useState } from 'react'
import { UserPlus, Check, Users, Eye, Video, Clock, Globe, Image } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatNumber, getScoreLabel } from '@/lib/utils'
import { NICHE_LABELS } from '@/lib/constants'
import type { Channel } from '@/types'

interface ChannelCardProps {
  channel: Channel & { prospect_score?: number; isBlurred?: boolean; scoreDetails?: unknown }
  isProspect?: boolean
  onAddProspect: (channel: Channel) => Promise<void>
  onAnalyze: (channel: Channel) => void
  onClick: (channel: Channel) => void
}

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷', US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', DE: '🇩🇪', ES: '🇪🇸',
  IT: '🇮🇹', BR: '🇧🇷', IN: '🇮🇳', JP: '🇯🇵', KR: '🇰🇷', AU: '🇦🇺',
  MX: '🇲🇽', BE: '🇧🇪', CH: '🇨🇭', PT: '🇵🇹', NL: '🇳🇱', MA: '🇲🇦',
  DZ: '🇩🇿', TN: '🇹🇳', SN: '🇸🇳',
}

const getScoreDark = (score: number) => {
  if (score >= 80) return 'text-red-400 border-red-500/30 bg-red-500/10'
  if (score >= 60) return 'text-orange-400 border-orange-500/30 bg-orange-500/10'
  if (score >= 40) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
  return 'text-gray-400 border-gray-500/30 bg-gray-500/10'
}

export default function ChannelCard({ channel, isProspect, onAddProspect, onAnalyze, onClick }: ChannelCardProps) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(isProspect || false)
  const score = channel.prospect_score ?? 0
  const scoreInfo = getScoreLabel(score)
  const blurred = (channel as { isBlurred?: boolean }).isBlurred

  const handleAddProspect = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (added || adding) return
    setAdding(true)
    try {
      await onAddProspect(channel)
      setAdded(true)
    } finally {
      setAdding(false)
    }
  }

  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAnalyze(channel)
  }

  return (
    <div
      className={`relative bg-[#111111] border border-white/5 rounded-2xl hover:border-red-500/20 hover:shadow-lg hover:shadow-red-500/5 hover:-translate-y-1 transition-all duration-200 cursor-pointer ${blurred ? 'overflow-hidden' : ''}`}
      onClick={() => !blurred && onClick(channel)}
    >
      {blurred && (
        <div className="absolute inset-0 z-10 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center rounded-2xl">
          <p className="text-sm font-bold text-white mb-2">Résultat masqué</p>
          <p className="text-xs text-gray-400 text-center px-4">Passez au plan Pro pour voir tous les résultats</p>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <img
            src={channel.thumbnail_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.channel_name)}&background=dc2626&color=fff`}
            alt={channel.channel_name}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-white/8"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.channel_name)}&background=dc2626&color=fff`
            }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate text-sm">{channel.channel_name}</h3>
            {channel.channel_handle && (
              <p className="text-xs text-gray-500 truncate">{channel.channel_handle}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              {channel.niche_category && (
                <Badge variant="info" size="sm">
                  {NICHE_LABELS[channel.niche_category] || channel.niche_category}
                </Badge>
              )}
              {channel.country && COUNTRY_FLAGS[channel.country] && (
                <span className="text-sm">{COUNTRY_FLAGS[channel.country]}</span>
              )}
            </div>
          </div>
          <div className={`px-2 py-1 rounded-lg text-xs font-black border ${getScoreDark(score)}`}>
            {score}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { icon: <Users className="w-3.5 h-3.5 text-red-400" />, value: `${formatNumber(channel.subscriber_count)} abonnés` },
            { icon: <Eye className="w-3.5 h-3.5 text-blue-400" />, value: `${channel.avg_views_last_10 ? formatNumber(channel.avg_views_last_10) : '—'} vues` },
            { icon: <Video className="w-3.5 h-3.5 text-purple-400" />, value: `${formatNumber(channel.video_count)} vidéos` },
            { icon: <Clock className="w-3.5 h-3.5 text-green-400" />, value: channel.upload_frequency_days ? (channel.upload_frequency_days <= 7 ? `${Math.round(7 / channel.upload_frequency_days)}x/sem` : `1/${Math.round(channel.upload_frequency_days)}j`) : '—' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
              {stat.icon}
              <span>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Score label */}
        <div className="mb-3">
          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${getScoreDark(score)}`}>
            {scoreInfo.label}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant={added ? 'secondary' : 'primary'} className="flex-1 text-xs" onClick={handleAddProspect} loading={adding} disabled={added}>
            {added ? <><Check className="w-3.5 h-3.5" /> Ajouté</> : <><UserPlus className="w-3.5 h-3.5" /> Prospecter</>}
          </Button>
          <Button size="sm" variant="outline" className="text-xs px-2" onClick={handleAnalyze} title="Analyser les miniatures">
            <Image className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-xs px-2" onClick={(e) => { e.stopPropagation(); window.open(`https://youtube.com/channel/${channel.youtube_channel_id}`, '_blank') }} title="Voir sur YouTube">
            <Globe className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
