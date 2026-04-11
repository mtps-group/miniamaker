'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, DollarSign, TrendingUp, Clock, CheckCircle, Lock, Target } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import ProgressBar from '@/components/ui/ProgressBar'
import { useToast } from '@/providers/ToastProvider'
import { useSupabase } from '@/providers/SupabaseProvider'
import { PLANS } from '@/lib/constants'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { RevenueEntry, RevenueGoal } from '@/types'

export default function RevenuePage() {
  const { user, profile } = useSupabase()
  const { showToast } = useToast()
  const [entries, setEntries] = useState<RevenueEntry[]>([])
  const [goal, setGoal] = useState<RevenueGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newEntry, setNewEntry] = useState({ amount: '', description: '', type: 'payment', status: 'paid', due_date: '' })
  const [newGoalAmount, setNewGoalAmount] = useState('')
  const supabase = createClient()
  const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]
  const canUse = plan.hasRevenue

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const now = new Date()
    const [entriesRes, goalRes] = await Promise.all([
      supabase.from('revenue_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('revenue_goals').select('*').eq('user_id', user.id)
        .eq('month', now.getMonth() + 1).eq('year', now.getFullYear()).single(),
    ])
    setEntries(entriesRes.data || [])
    setGoal(goalRes.data)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const addEntry = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('revenue_entries')
        .insert({
          user_id: user?.id,
          amount: Number(newEntry.amount),
          description: newEntry.description || null,
          type: newEntry.type,
          status: newEntry.status,
          due_date: newEntry.due_date || null,
          currency: 'EUR',
        })
        .select()
        .single()

      if (error) throw error
      setEntries(prev => [data, ...prev])
      setShowAddModal(false)
      setNewEntry({ amount: '', description: '', type: 'payment', status: 'paid', due_date: '' })
      showToast('Paiement ajouté !')
    } finally {
      setSaving(false)
    }
  }

  const saveGoal = async () => {
    setSaving(true)
    const now = new Date()
    try {
      const { data, error } = await supabase
        .from('revenue_goals')
        .upsert({
          user_id: user?.id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          target_amount: Number(newGoalAmount),
        }, { onConflict: 'user_id,month,year' })
        .select()
        .single()

      if (error) throw error
      setGoal(data)
      setShowGoalModal(false)
      showToast('Objectif mis à jour !')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('revenue_entries').update({ status }).eq('id', id)
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: status as RevenueEntry['status'] } : e))
    showToast('Statut mis à jour')
  }

  const now = new Date()
  const thisMonthEntries = entries.filter(e => {
    const d = new Date(e.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const thisMonthRevenue = thisMonthEntries.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0)
  const pendingRevenue = entries.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0)
  const totalRevenue = entries.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0)

  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const monthEntries = entries.filter(e => {
      const ed = new Date(e.created_at)
      return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear() && e.status === 'paid'
    })
    return {
      label: MONTHS[d.getMonth()],
      amount: monthEntries.reduce((s, e) => s + e.amount, 0),
    }
  })
  const maxMonth = Math.max(...last6Months.map(m => m.amount), 1)

  if (!canUse) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-white">Suivi des revenus</h1></div>
        <div className="text-center py-20 bg-[#111111] rounded-xl border border-white/5">
          <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-600 mb-2">Fonctionnalité Business</p>
          <p className="text-sm text-gray-500 mb-4">Le suivi des revenus est disponible sur le plan Business</p>
          <Button onClick={() => window.location.href = '/abonnement'}>Passer au Business →</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Suivi des revenus</h1>
          <p className="text-gray-500 mt-1">Suivez vos gains et atteignez vos objectifs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setNewGoalAmount(goal?.target_amount?.toString() || ''); setShowGoalModal(true) }}>
            <Target className="w-4 h-4" /> Objectif mensuel
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Ajouter un paiement
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111111] rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-green-500" /><span className="text-sm text-gray-500">Ce mois-ci</span></div>
          <p className="text-2xl font-bold text-white">{formatCurrency(thisMonthRevenue)}</p>
          {goal && (
            <div className="mt-2">
              <ProgressBar value={thisMonthRevenue} max={goal.target_amount} color={thisMonthRevenue >= goal.target_amount ? 'green' : 'red'} />
              <p className="text-xs text-gray-500 mt-1">Objectif: {formatCurrency(goal.target_amount)}</p>
            </div>
          )}
        </div>
        <div className="bg-[#111111] rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-yellow-500" /><span className="text-sm text-gray-500">En attente</span></div>
          <p className="text-2xl font-bold text-white">{formatCurrency(pendingRevenue)}</p>
        </div>
        <div className="bg-[#111111] rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-red-400" /><span className="text-sm text-gray-500">Total encaissé</span></div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#111111] rounded-xl border border-white/5 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-white mb-4">Revenus des 6 derniers mois</h2>
        <div className="flex items-end gap-3 h-32">
          {last6Months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                <div
                  className="w-full bg-red-600 rounded-t-md transition-all"
                  style={{ height: `${(m.amount / maxMonth) * 100}%`, minHeight: m.amount > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-xs text-gray-400">{m.label}</span>
              {m.amount > 0 && <span className="text-xs font-medium text-gray-600">{formatCurrency(m.amount)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Entries list */}
      <div className="bg-[#111111] rounded-xl border border-white/5 shadow-sm">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Historique</h2>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {entries.map(entry => (
              <div key={entry.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.status === 'paid' ? 'bg-green-100' : entry.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                  {entry.status === 'paid'
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : <Clock className="w-4 h-4 text-yellow-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{entry.description || 'Paiement'}</p>
                  <p className="text-xs text-gray-400">{formatRelativeDate(entry.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${entry.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                    {entry.type === 'refund' ? '-' : '+'}{formatCurrency(entry.amount)}
                  </p>
                  <select
                    value={entry.status}
                    onChange={e => updateStatus(entry.id, e.target.value)}
                    className="text-xs border border-white/8 rounded px-1.5 py-0.5 mt-1 bg-[#1a1a1a] text-white"
                  >
                    <option value="pending">En attente</option>
                    <option value="paid">Payé</option>
                    <option value="overdue">En retard</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Ajouter un paiement" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Montant (€) *</label>
            <input type="number" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="150"
              value={newEntry.amount} onChange={e => setNewEntry(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input type="text" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="Miniature pour @channel"
              value={newEntry.description} onChange={e => setNewEntry(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
              <select className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                value={newEntry.type} onChange={e => setNewEntry(p => ({ ...p, type: e.target.value }))}>
                <option value="payment">Paiement</option>
                <option value="invoice">Facture</option>
                <option value="refund">Remboursement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Statut</label>
              <select className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                value={newEntry.status} onChange={e => setNewEntry(p => ({ ...p, status: e.target.value }))}>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
                <option value="overdue">En retard</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button onClick={addEntry} loading={saving} disabled={!newEntry.amount}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* Goal Modal */}
      <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title="Objectif mensuel" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Objectif de revenus ce mois (€)</label>
            <input type="number" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="2000"
              value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowGoalModal(false)}>Annuler</Button>
            <Button onClick={saveGoal} loading={saving} disabled={!newGoalAmount}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
