'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Briefcase, DollarSign, Clock, CheckCircle, Lock, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { useToast } from '@/providers/ToastProvider'
import { useSupabase } from '@/providers/SupabaseProvider'
import { PLANS, DELIVERABLE_STATUSES } from '@/lib/constants'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils'
import type { Client, Deliverable, ContractType, DeliverableStatus } from '@/types'

type ClientWithDeliverables = Client & { deliverables?: Deliverable[] }

export default function ClientsPage() {
  const { profile } = useSupabase()
  const { showToast } = useToast()
  const [clients, setClients] = useState<ClientWithDeliverables[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newClient, setNewClient] = useState({
    client_name: '',
    client_email: '',
    channel_name: '',
    contract_type: 'per_thumbnail' as ContractType,
    per_thumbnail_rate: '',
    monthly_rate: '',
    contract_start: '',
    notes: '',
  })
  const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]
  const canUseClients = plan.hasClients

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      setClients(data.clients || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const addClient = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          per_thumbnail_rate: newClient.per_thumbnail_rate ? Number(newClient.per_thumbnail_rate) : null,
          monthly_rate: newClient.monthly_rate ? Number(newClient.monthly_rate) : null,
          contract_start: newClient.contract_start || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Erreur', 'error'); return }
      setClients(prev => [{ ...data.client, deliverables: [] }, ...prev])
      setShowAddModal(false)
      setNewClient({ client_name: '', client_email: '', channel_name: '', contract_type: 'per_thumbnail', per_thumbnail_rate: '', monthly_rate: '', contract_start: '', notes: '' })
      showToast('Client ajouté !')
    } finally {
      setSaving(false)
    }
  }

  const updateDeliverableStatus = async (deliverableId: string, clientId: string, status: DeliverableStatus) => {
    await fetch('/api/clients/deliverables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deliverableId, status }),
    })
    setClients(prev => prev.map(c => c.id === clientId
      ? { ...c, deliverables: c.deliverables?.map(d => d.id === deliverableId ? { ...d, status } : d) }
      : c
    ))
    showToast('Statut mis à jour')
  }

  const addDeliverable = async (clientId: string, title: string, dueDate: string, price: string) => {
    const res = await fetch('/api/clients/deliverables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, title, due_date: dueDate || null, price: price ? Number(price) : null }),
    })
    const data = await res.json()
    if (res.ok) {
      setClients(prev => prev.map(c => c.id === clientId
        ? { ...c, deliverables: [...(c.deliverables || []), data.deliverable] }
        : c
      ))
      showToast('Livrable ajouté !')
    }
  }

  const activeClients = clients.filter(c => c.is_active)
  const inactiveClients = clients.filter(c => !c.is_active)
  const totalMRR = activeClients.reduce((sum, c) => sum + (c.monthly_rate || 0), 0)

  if (!canUseClients) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Gestion des clients</h1>
        </div>
        <div className="text-center py-20 bg-[#111111] rounded-xl border border-white/5">
          <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-600 mb-2">Fonctionnalité Pro</p>
          <p className="text-sm text-gray-500 mb-4">La gestion des clients est disponible sur le plan Pro et Business</p>
          <Button onClick={() => window.location.href = '/abonnement'}>Passer au plan Pro →</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des clients</h1>
          <p className="text-gray-500 mt-1">Suivez vos clients et vos livrables</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> Nouveau client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111111] rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2"><Briefcase className="w-4 h-4 text-blue-500" /><span className="text-sm text-gray-500">Clients actifs</span></div>
          <p className="text-2xl font-bold text-white">{activeClients.length}</p>
        </div>
        <div className="bg-[#111111] rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-green-500" /><span className="text-sm text-gray-500">MRR</span></div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalMRR)}</p>
        </div>
        <div className="bg-[#111111] rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-orange-500" /><span className="text-sm text-gray-500">Livrables en cours</span></div>
          <p className="text-2xl font-bold text-white">
            {clients.flatMap(c => c.deliverables || []).filter(d => d.status !== 'livre').length}
          </p>
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 bg-[#111111] rounded-xl border border-white/5">
          <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">Aucun client pour le moment</p>
          <p className="text-sm text-gray-500 mt-1">Ajoutez vos premiers clients pour commencer le suivi</p>
          <Button className="mt-4" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Ajouter un client
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => {
            const isExpanded = expandedClient === client.id
            const pendingDeliverables = client.deliverables?.filter(d => d.status !== 'livre') || []
            const today = new Date().toISOString().split('T')[0]
            const overdueCount = pendingDeliverables.filter(d => d.due_date && d.due_date < today).length

            return (
              <div key={client.id} className="bg-[#111111] rounded-xl border border-white/5 shadow-sm">
                {/* Client header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 hover:border-red-500/20 rounded-xl"
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {client.client_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{client.client_name}</h3>
                      {!client.is_active && <Badge variant="default">Inactif</Badge>}
                      {overdueCount > 0 && <Badge variant="danger">⚠️ {overdueCount} en retard</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {client.channel_name && <span className="text-xs text-gray-500">{client.channel_name}</span>}
                      {client.per_thumbnail_rate && (
                        <span className="text-xs text-green-600 font-medium">{formatCurrency(client.per_thumbnail_rate)}/miniature</span>
                      )}
                      {client.monthly_rate && (
                        <span className="text-xs text-green-600 font-medium">{formatCurrency(client.monthly_rate)}/mois</span>
                      )}
                      <span className="text-xs text-gray-500">{pendingDeliverables.length} livrable(s) en cours</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>

                {/* Deliverables */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-300 text-sm">Livrables</h4>
                      <AddDeliverableInline onAdd={(title, dueDate, price) => addDeliverable(client.id, title, dueDate, price)} />
                    </div>
                    {client.deliverables && client.deliverables.length > 0 ? (
                      <div className="space-y-2">
                        {client.deliverables.map(deliverable => {
                          const statusConfig = DELIVERABLE_STATUSES.find(s => s.value === deliverable.status)
                          const isOverdue = deliverable.due_date && deliverable.due_date < today && deliverable.status !== 'livre'
                          return (
                            <div key={deliverable.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${isOverdue ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-200">{deliverable.title}</p>
                                  {deliverable.price && (
                                    <span className="text-xs text-green-600">{formatCurrency(deliverable.price)}</span>
                                  )}
                                </div>
                                {deliverable.due_date && (
                                  <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                    {isOverdue ? '⚠️ En retard · ' : ''}Échéance: {formatDate(deliverable.due_date)}
                                  </p>
                                )}
                              </div>
                              <select
                                value={deliverable.status}
                                onChange={e => updateDeliverableStatus(deliverable.id, client.id, e.target.value as DeliverableStatus)}
                                className="text-xs border border-white/8 rounded-lg px-2 py-1 bg-[#1a1a1a] text-white"
                              >
                                {DELIVERABLE_STATUSES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-3">Aucun livrable</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nouveau client" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Nom du client *</label>
              <input type="text" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="John Doe"
                value={newClient.client_name} onChange={e => setNewClient(p => ({ ...p, client_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input type="email" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="john@youtube.com"
                value={newClient.client_email} onChange={e => setNewClient(p => ({ ...p, client_email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Chaîne YouTube</label>
              <input type="text" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="@handle"
                value={newClient.channel_name} onChange={e => setNewClient(p => ({ ...p, channel_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Type de contrat</label>
              <select className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                value={newClient.contract_type} onChange={e => setNewClient(p => ({ ...p, contract_type: e.target.value as ContractType }))}>
                <option value="per_thumbnail">Par miniature</option>
                <option value="monthly">Mensuel</option>
                <option value="package">Forfait</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Tarif / miniature (€)</label>
              <input type="number" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="150"
                value={newClient.per_thumbnail_rate} onChange={e => setNewClient(p => ({ ...p, per_thumbnail_rate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Retainer mensuel (€)</label>
              <input type="number" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="500"
                value={newClient.monthly_rate} onChange={e => setNewClient(p => ({ ...p, monthly_rate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Date de début</label>
            <input type="date" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
              value={newClient.contract_start} onChange={e => setNewClient(p => ({ ...p, contract_start: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button onClick={addClient} loading={saving} disabled={!newClient.client_name}>Ajouter le client</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AddDeliverableInline({ onAdd }: { onAdd: (title: string, dueDate: string, price: string) => void }) {
  const [show, setShow] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [price, setPrice] = useState('')

  const handleAdd = () => {
    if (!title.trim()) return
    onAdd(title, dueDate, price)
    setTitle(''); setDueDate(''); setPrice(''); setShow(false)
  }

  if (!show) return (
    <Button size="sm" variant="outline" onClick={() => setShow(true)}>
      <Plus className="w-3.5 h-3.5" /> Ajouter
    </Button>
  )

  return (
    <div className="flex gap-2 items-center">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du livrable"
        className="px-2 py-1 bg-[#1a1a1a] border border-white/8 rounded-lg text-xs text-white w-36" />
      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
        className="px-2 py-1 bg-[#1a1a1a] border border-white/8 rounded-lg text-xs text-white w-32" />
      <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Prix€"
        className="px-2 py-1 bg-[#1a1a1a] border border-white/8 rounded-lg text-xs text-white w-16" />
      <Button size="sm" onClick={handleAdd} disabled={!title.trim()}>OK</Button>
      <Button size="sm" variant="ghost" onClick={() => setShow(false)}>✕</Button>
    </div>
  )
}
