'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Search, SlidersHorizontal, X, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import ChannelCard from '@/components/search/ChannelCard'
import ChannelDetailPanel from '@/components/search/ChannelDetailPanel'
import { useToast } from '@/providers/ToastProvider'
import { useSupabase } from '@/providers/SupabaseProvider'
import { PLANS, NICHE_LABELS } from '@/lib/constants'
import { COUNTRIES } from '@/types'
import type { Channel, SearchFilters } from '@/types'

type ChannelWithScore = Channel & { prospect_score?: number; isBlurred?: boolean; scoreDetails?: unknown }

const DEFAULT_FILTERS: SearchFilters = {}

export default function RecherchePage() {
  const { profile } = useSupabase()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<ChannelWithScore[]>([])
  const [total, setTotal] = useState(0)
  const [searchesRemaining, setSearchesRemaining] = useState<number | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<ChannelWithScore | null>(null)
  const [prospectIds, setProspectIds] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'score' | 'subscribers' | 'views'>('score')
  const [searched, setSearched] = useState(false)

  const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    // Si pas de mot-clé, on utilise la niche ou le pays comme mot-clé automatique
    const autoQuery = query.trim() || filters.niche || filters.country || 'youtube'
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: autoQuery, filters }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.limitReached ? 'Limite de recherches atteinte. Passez au plan Pro !' : (data.error || 'Erreur lors de la recherche'), 'error')
        return
      }
      setChannels(data.channels || [])
      setTotal(data.total || 0)
      setSearchesRemaining(data.searchesRemaining)
    } catch {
      showToast('Erreur de connexion', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProspect = async (channel: Channel) => {
    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channel.id }),
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error || 'Erreur', 'error'); throw new Error(data.error) }
    setProspectIds(prev => new Set([...prev, channel.id]))
    showToast(`${channel.channel_name} ajouté aux prospects !`)
  }

  const handleAnalyze = (channel: Channel) => {
    window.location.href = `/analyse?channelId=${channel.youtube_channel_id}`
  }

  const sortedChannels = [...channels].sort((a, b) => {
    if (sortBy === 'score') return (b.prospect_score ?? 0) - (a.prospect_score ?? 0)
    if (sortBy === 'subscribers') return (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0)
    if (sortBy === 'views') return (b.avg_views_last_10 ?? 0) - (a.avg_views_last_10 ?? 0)
    return 0
  })

  const selectClass = "w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50"

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Rechercher des chaînes YouTube</h1>
        <p className="text-gray-500 mt-1">Trouvez les chaînes qui ont besoin de meilleures miniatures</p>
      </div>

      {/* Search Form */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 mb-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Optionnel — laissez vide pour rechercher par filtres uniquement"
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
            />
          </div>
          <Button
            type="button"
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {Object.keys(filters).filter(k => filters[k as keyof SearchFilters] !== undefined).length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.keys(filters).filter(k => filters[k as keyof SearchFilters] !== undefined).length}
              </span>
            )}
          </Button>
          <Button type="submit" loading={loading}>
            <Search className="w-4 h-4" />
            Rechercher
          </Button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Abonnés min</label>
                <select className={selectClass} value={filters.minSubscribers || ''} onChange={e => setFilters(f => ({ ...f, minSubscribers: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">Tous</option>
                  <option value="1000">1K</option>
                  <option value="5000">5K</option>
                  <option value="10000">10K</option>
                  <option value="50000">50K</option>
                  <option value="100000">100K</option>
                  <option value="500000">500K</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Abonnés max</label>
                <select className={selectClass} value={filters.maxSubscribers || ''} onChange={e => setFilters(f => ({ ...f, maxSubscribers: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">Tous</option>
                  <option value="10000">10K</option>
                  <option value="50000">50K</option>
                  <option value="100000">100K</option>
                  <option value="500000">500K</option>
                  <option value="1000000">1M</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Niche</label>
                <select className={selectClass} value={filters.niche || ''} onChange={e => setFilters(f => ({ ...f, niche: e.target.value || undefined }))}>
                  <option value="">Toutes les niches</option>
                  {Object.entries(NICHE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Pays</label>
                <select className={selectClass} value={filters.country || ''} onChange={e => setFilters(f => ({ ...f, country: e.target.value || undefined }))}>
                  <option value="">Tous les pays</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                <X className="w-3.5 h-3.5" /> Réinitialiser
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Limit warning */}
      {searchesRemaining !== null && searchesRemaining <= 1 && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            {searchesRemaining === 0 ? 'Vous avez atteint votre limite de recherches. ' : `Il vous reste ${searchesRemaining} recherche(s). `}
            <a href="/abonnement" className="underline font-medium text-amber-200">Passez au plan Pro</a> pour des recherches illimitées.
          </p>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-[#111111] border border-white/5 rounded-2xl p-4">
                <div className="flex gap-3 mb-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ) : searched && channels.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucun résultat trouvé</p>
          <p className="text-sm text-gray-600">Essayez un autre mot-clé ou modifiez vos filtres</p>
        </div>
      ) : channels.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-white">{total}</span> chaînes trouvées
              </p>
              {profile?.plan === 'free' && (
                <Badge variant="warning">Plan gratuit · {plan.visibleResults} résultats visibles</Badge>
              )}
            </div>
            <select className="px-3 py-1.5 bg-[#1a1a1a] border border-white/8 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/30" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="score">Par score prospect</option>
              <option value="subscribers">Par abonnés</option>
              <option value="views">Par vues moyennes</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedChannels.map(channel => (
              <ChannelCard
                key={channel.id || channel.youtube_channel_id}
                channel={channel}
                isProspect={prospectIds.has(channel.id)}
                onAddProspect={handleAddProspect}
                onAnalyze={handleAnalyze}
                onClick={(ch) => setSelectedChannel(ch as ChannelWithScore)}
              />
            ))}
          </div>

          {profile?.plan === 'free' && total > plan.visibleResults && (
            <div className="mt-6 p-6 bg-gradient-to-r from-red-900/20 to-transparent border border-red-500/20 rounded-2xl text-center">
              <p className="font-bold text-white mb-1">{total - plan.visibleResults} résultats masqués</p>
              <p className="text-sm text-gray-500 mb-4">Passez au plan Pro pour voir tous les résultats</p>
              <Button onClick={() => window.location.href = '/abonnement'}>Passer au plan Pro →</Button>
            </div>
          )}
        </div>
      ) : !searched ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Search className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="font-bold text-white mb-2">Trouvez vos prochains clients</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Recherchez des chaînes YouTube par niche, pays ou mot-clé. Notre algorithme identifie celles qui ont le plus besoin de meilleures miniatures.
          </p>
        </div>
      ) : null}

      {selectedChannel && (
        <ChannelDetailPanel
          channel={selectedChannel}
          isProspect={prospectIds.has(selectedChannel.id)}
          onClose={() => setSelectedChannel(null)}
          onAddProspect={handleAddProspect}
          onAnalyze={handleAnalyze}
        />
      )}
    </div>
  )
}
