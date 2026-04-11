'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Filter, Users, ExternalLink, Edit2, Trash2, Clock, DollarSign, Tag } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { useToast } from '@/providers/ToastProvider'
import { useSupabase } from '@/providers/SupabaseProvider'
import { PROSPECT_STATUSES, PRIORITY_CONFIG, PLANS, NICHE_LABELS } from '@/lib/constants'
import { formatNumber, formatRelativeDate, formatDate } from '@/lib/utils'
import type { Prospect, ProspectStatus, ProspectPriority } from '@/types'

type ProspectWithChannel = Prospect & {
  channel?: {
    channel_name: string
    thumbnail_url: string | null
    youtube_channel_id: string
    subscriber_count: number
    niche_category: string | null
    prospect_score: number | null
  }
}

export default function ProspectsPage() {
  const { profile } = useSupabase()
  const { showToast } = useToast()
  const [prospects, setProspects] = useState<ProspectWithChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<ProspectStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProspect, setEditingProspect] = useState<ProspectWithChannel | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]

  const fetchProspects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/prospects')
      const data = await res.json()
      setProspects(data.prospects || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProspects() }, [fetchProspects])

  const updateStatus = async (id: string, status: ProspectStatus) => {
    await fetch('/api/prospects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    showToast('Statut mis à jour')
  }

  const deleteProspect = async (id: string) => {
    if (!confirm('Supprimer ce prospect ?')) return
    await fetch(`/api/prospects?id=${id}`, { method: 'DELETE' })
    setProspects(prev => prev.filter(p => p.id !== id))
    showToast('Prospect supprimé')
  }

  const saveEdit = async () => {
    if (!editingProspect) return
    setSaving(true)
    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProspect.id,
          notes: editingProspect.notes,
          contact_email: editingProspect.contact_email,
          contact_name: editingProspect.contact_name,
          estimated_value: editingProspect.estimated_value,
          priority: editingProspect.priority,
          next_followup_at: editingProspect.next_followup_at,
        }),
      })
      const data = await res.json()
      setProspects(prev => prev.map(p => p.id === editingProspect.id ? { ...p, ...data.prospect } : p))
      setShowEditModal(false)
      showToast('Prospect mis à jour')
    } finally {
      setSaving(false)
    }
  }

  const filtered = prospects
    .filter(p => activeStatus === 'all' || p.status === activeStatus)
    .filter(p => !searchQuery || p.channel?.channel_name?.toLowerCase().includes(searchQuery.toLowerCase()))

  const countByStatus = PROSPECT_STATUSES.reduce((acc, s) => {
    acc[s.value] = prospects.filter(p => p.status === s.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline de prospects</h1>
          <p className="text-gray-500 mt-1">Gérez votre processus de prospection</p>
        </div>
        <Button onClick={() => window.location.href = '/recherche'}>
          <Plus className="w-4 h-4" /> Ajouter un prospect
        </Button>
      </div>

      {/* Status tabs + search */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white/8 rounded-xl p-1">
          <button
            onClick={() => setActiveStatus('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeStatus === 'all' ? 'bg-[#111111] shadow-sm text-white' : 'text-gray-500 hover:text-gray-600'}`}
          >
            Tous
            <span className="ml-1.5 text-xs bg-white/8 text-gray-500 px-1.5 py-0.5 rounded-full">{prospects.length}</span>
          </button>
          {PROSPECT_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setActiveStatus(s.value as ProspectStatus)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${activeStatus === s.value ? 'bg-[#111111] shadow-sm text-white' : 'text-gray-500 hover:text-gray-600'}`}
            >
              {s.emoji}
              <span className="ml-1 hidden sm:inline">{s.label}</span>
              {countByStatus[s.value] > 0 && (
                <span className="ml-1.5 text-xs bg-white/8 text-gray-500 px-1.5 py-0.5 rounded-full">{countByStatus[s.value]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une chaîne..."
            className="pl-9 pr-4 py-2 bg-[#1a1a1a] border border-white/8 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {PROSPECT_STATUSES.map(s => (
          <div
            key={s.value}
            onClick={() => setActiveStatus(s.value as ProspectStatus)}
            className={`bg-[#111111] rounded-xl border p-3 cursor-pointer hover:border-red-500/20 transition-all ${activeStatus === s.value ? 'border-red-500 shadow-sm' : 'border-white/5'}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{s.emoji}</span>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{countByStatus[s.value] || 0}</p>
          </div>
        ))}
      </div>

      {/* Prospect List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#111111] rounded-xl border border-white/5 p-4">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#111111] rounded-xl border border-white/5">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">Aucun prospect trouvé</p>
          <p className="text-sm text-gray-500 mt-1">
            {activeStatus !== 'all' ? 'Aucun prospect dans cette colonne' : 'Recherchez des chaînes pour commencer à prospecter'}
          </p>
          <Button className="mt-4" onClick={() => window.location.href = '/recherche'}>
            <Search className="w-4 h-4" /> Rechercher des chaînes
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(prospect => {
            const statusConfig = PROSPECT_STATUSES.find(s => s.value === prospect.status)
            const priorityConfig = PRIORITY_CONFIG[prospect.priority]
            return (
              <div key={prospect.id} className="bg-[#111111] rounded-xl border border-white/5 shadow-sm hover:shadow-md transition-all">
                <div className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <img
                    src={prospect.channel?.thumbnail_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(prospect.channel?.channel_name || 'C')}&background=6366f1&color=fff`}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=C&background=6366f1&color=fff` }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{prospect.channel?.channel_name}</h3>
                      {statusConfig && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}>
                          {statusConfig.emoji} {statusConfig.label}
                        </span>
                      )}
                      {prospect.priority !== 'medium' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {prospect.channel?.subscriber_count && (
                        <span className="text-xs text-gray-500">{formatNumber(prospect.channel.subscriber_count)} abonnés</span>
                      )}
                      {prospect.channel?.niche_category && (
                        <span className="text-xs text-gray-500">{NICHE_LABELS[prospect.channel.niche_category] || prospect.channel.niche_category}</span>
                      )}
                      {prospect.estimated_value && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" />{prospect.estimated_value}€
                        </span>
                      )}
                      {prospect.next_followup_at && (
                        <span className="text-xs text-orange-600 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {formatDate(prospect.next_followup_at)}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">Ajouté {formatRelativeDate(prospect.created_at)}</span>
                    </div>
                    {prospect.notes && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">"{prospect.notes}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status dropdown */}
                    <select
                      value={prospect.status}
                      onChange={e => updateStatus(prospect.id, e.target.value as ProspectStatus)}
                      className="text-xs border border-white/8 rounded-lg px-2 py-1.5 bg-[#111111] focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      {PROSPECT_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                      ))}
                    </select>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingProspect(prospect); setShowEditModal(true) }}
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`https://youtube.com/channel/${prospect.channel?.youtube_channel_id}`, '_blank')}
                      title="Voir la chaîne"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteProspect(prospect.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingProspect && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Modifier - ${editingProspect.channel?.channel_name}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Statut</label>
                <select
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                  value={editingProspect.status}
                  onChange={e => setEditingProspect(p => p ? { ...p, status: e.target.value as ProspectStatus } : p)}
                >
                  {PROSPECT_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Priorité</label>
                <select
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                  value={editingProspect.priority}
                  onChange={e => setEditingProspect(p => p ? { ...p, priority: e.target.value as ProspectPriority } : p)}
                >
                  {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nom du contact</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                  placeholder="John Doe"
                  value={editingProspect.contact_name || ''}
                  onChange={e => setEditingProspect(p => p ? { ...p, contact_name: e.target.value } : p)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email du contact</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                  placeholder="contact@youtube.com"
                  value={editingProspect.contact_email || ''}
                  onChange={e => setEditingProspect(p => p ? { ...p, contact_email: e.target.value } : p)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Valeur estimée (€)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                  placeholder="500"
                  value={editingProspect.estimated_value || ''}
                  onChange={e => setEditingProspect(p => p ? { ...p, estimated_value: Number(e.target.value) } : p)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Prochaine relance</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                  value={editingProspect.next_followup_at?.split('T')[0] || ''}
                  onChange={e => setEditingProspect(p => p ? { ...p, next_followup_at: e.target.value } : p)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white resize-none"
                placeholder="Notes sur ce prospect..."
                value={editingProspect.notes || ''}
                onChange={e => setEditingProspect(p => p ? { ...p, notes: e.target.value } : p)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Annuler</Button>
              <Button onClick={saveEdit} loading={saving}>Enregistrer</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
