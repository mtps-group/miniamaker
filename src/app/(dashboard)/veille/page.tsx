'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Eye, Bell, Plus, Trash2, Lock, TrendingUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/providers/ToastProvider'
import { useSupabase } from '@/providers/SupabaseProvider'
import { PLANS, NICHE_LABELS } from '@/lib/constants'
import { formatRelativeDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { SavedSearch } from '@/types'

export default function VeillePage() {
  const { user, profile } = useSupabase()
  const { showToast } = useToast()
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newSearch, setNewSearch] = useState({ name: '', niche: '', country: '', minSubscribers: '' })
  const supabase = createClient()
  const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]
  const canUse = plan.hasWatchlists

  useEffect(() => {
    if (!user) return
    supabase.from('saved_searches').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setSavedSearches(data || []); setLoading(false) })
  }, [user])

  const saveSavedSearch = async () => {
    setSaving(true)
    const filters: Record<string, unknown> = {}
    if (newSearch.niche) filters.niche = newSearch.niche
    if (newSearch.country) filters.country = newSearch.country
    if (newSearch.minSubscribers) filters.minSubscribers = Number(newSearch.minSubscribers)

    const { data, error } = await supabase.from('saved_searches')
      .insert({ name: newSearch.name, filters, user_id: user?.id, alert_enabled: true, new_matches_count: 0 })
      .select().single()

    setSaving(false)
    if (!error && data) {
      setSavedSearches(prev => [data, ...prev])
      setShowAddModal(false)
      setNewSearch({ name: '', niche: '', country: '', minSubscribers: '' })
      showToast('Recherche sauvegardée !')
    }
  }

  const deleteSavedSearch = async (id: string) => {
    await supabase.from('saved_searches').delete().eq('id', id)
    setSavedSearches(prev => prev.filter(s => s.id !== id))
    showToast('Recherche supprimée')
  }

  const TRENDING_NICHES = [
    { niche: 'business', label: 'Business & Finance', growth: '+34%', channels: '12K' },
    { niche: 'tech', label: 'Tech & Reviews', growth: '+22%', channels: '28K' },
    { niche: 'fitness', label: 'Fitness & Santé', growth: '+18%', channels: '8K' },
    { niche: 'crypto', label: 'Crypto & Web3', growth: '+15%', channels: '5K' },
    { niche: 'coaching', label: 'Coaching & Mindset', growth: '+12%', channels: '3K' },
  ]

  if (!canUse) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-white">Veille & Alertes</h1></div>
        <div className="text-center py-20 bg-[#111111] rounded-xl border border-white/5">
          <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-300 mb-2">Fonctionnalité Pro</p>
          <p className="text-sm text-gray-500 mb-4">Les recherches sauvegardées sont disponibles sur le plan Pro</p>
          <Button onClick={() => window.location.href = '/abonnement'}>Passer au plan Pro →</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Veille & Alertes</h1>
          <p className="text-gray-500 mt-1">Suivez les tendances et soyez alerté des nouveaux prospects</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> Nouvelle alerte
        </Button>
      </div>

      {/* Trending niches */}
      <div className="bg-[#111111] rounded-xl border border-white/5 p-5 mb-5">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-400" /> Niches en croissance cette semaine
        </h2>
        <div className="space-y-2">
          {TRENDING_NICHES.map((trend, i) => (
            <div key={trend.niche} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-lg transition-colors">
              <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-200">{trend.label}</p>
                  <Badge variant="success" size="sm">{trend.growth}</Badge>
                </div>
                <p className="text-xs text-gray-400">{trend.channels} chaînes actives</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => window.location.href = `/recherche?niche=${trend.niche}`}>
                Rechercher
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Searches */}
      <div>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-red-400" /> Mes alertes sauvegardées
        </h2>
        {loading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : savedSearches.length === 0 ? (
          <div className="bg-[#111111] rounded-xl border border-white/5 p-8 text-center">
            <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucune alerte sauvegardée</p>
            <p className="text-xs text-gray-600 mt-1">Créez une alerte pour être notifié de nouvelles chaînes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedSearches.map(search => (
              <div key={search.id} className="bg-[#111111] rounded-xl border border-white/5 p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${search.alert_enabled ? 'bg-green-500/15' : 'bg-white/5'}`}>
                  <Bell className={`w-4 h-4 ${search.alert_enabled ? 'text-green-400' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{search.name}</p>
                    {search.new_matches_count > 0 && (
                      <Badge variant="success" size="sm">{search.new_matches_count} nouveaux</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {search.filters.niche && <span className="text-xs text-gray-500">Niche: {NICHE_LABELS[search.filters.niche] || search.filters.niche}</span>}
                    {search.filters.minSubscribers && <span className="text-xs text-gray-500">Min {(search.filters.minSubscribers as number / 1000).toFixed(0)}K abonnés</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Créée {formatRelativeDate(search.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const params = new URLSearchParams()
                    if (search.filters.niche) params.set('niche', search.filters.niche as string)
                    window.location.href = `/recherche?${params.toString()}`
                  }}>
                    Lancer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteSavedSearch(search.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nouvelle alerte" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nom de l'alerte *</label>
            <input type="text" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white placeholder-gray-600" placeholder="Chaînes gaming FR"
              value={newSearch.name} onChange={e => setNewSearch(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Niche</label>
            <select className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
              value={newSearch.niche} onChange={e => setNewSearch(p => ({ ...p, niche: e.target.value }))}>
              <option value="">Toutes les niches</option>
              {Object.entries(NICHE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Abonnés minimum</label>
            <input type="number" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white placeholder-gray-600" placeholder="10000"
              value={newSearch.minSubscribers} onChange={e => setNewSearch(p => ({ ...p, minSubscribers: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button onClick={saveSavedSearch} loading={saving} disabled={!newSearch.name}>Créer l'alerte</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
