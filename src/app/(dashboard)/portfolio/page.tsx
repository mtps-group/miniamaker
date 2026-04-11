'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Lock, Eye, Link, Trash2, Image as ImageIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/providers/ToastProvider'
import { useSupabase } from '@/providers/SupabaseProvider'
import { PLANS, NICHE_LABELS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { PortfolioItem } from '@/types'

export default function PortfolioPage() {
  const { user, profile } = useSupabase()
  const { showToast } = useToast()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({ title: '', description: '', image_url: '', before_image_url: '', client_name: '', category: '', youtube_video_url: '' })
  const supabase = createClient()
  const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]
  const canUse = plan.hasPortfolio
  const portfolioUrl = profile?.portfolio_slug ? `${window?.location?.origin}/portfolio/${profile.portfolio_slug}` : null

  useEffect(() => {
    if (!user) return
    supabase.from('portfolio_items').select('*').eq('user_id', user.id).order('position')
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [user])

  const addItem = async () => {
    setSaving(true)
    const { data, error } = await supabase.from('portfolio_items')
      .insert({ ...newItem, user_id: user?.id, position: items.length, is_visible: true, before_image_url: newItem.before_image_url || null })
      .select().single()
    setSaving(false)
    if (!error && data) {
      setItems(prev => [...prev, data])
      setShowAddModal(false)
      setNewItem({ title: '', description: '', image_url: '', before_image_url: '', client_name: '', category: '', youtube_video_url: '' })
      showToast('Miniature ajoutée au portfolio !')
    }
  }

  const deleteItem = async (id: string) => {
    await supabase.from('portfolio_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('Élément supprimé')
  }

  const togglePublic = async () => {
    await supabase.from('profiles').update({ portfolio_public: !profile?.portfolio_public }).eq('id', user?.id || '')
    showToast(profile?.portfolio_public ? 'Portfolio masqué' : 'Portfolio rendu public !')
  }

  if (!canUse) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-white">Mon Portfolio</h1></div>
        <div className="text-center py-20 bg-[#111111] rounded-xl border border-white/5">
          <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-600 mb-2">Fonctionnalité Business</p>
          <p className="text-sm text-gray-500 mb-4">Le portfolio public est disponible sur le plan Business</p>
          <Button onClick={() => window.location.href = '/abonnement'}>Passer au Business →</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mon Portfolio</h1>
          <p className="text-gray-500 mt-1">Votre vitrine pour les prospects</p>
        </div>
        <div className="flex gap-2">
          {portfolioUrl && (
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(portfolioUrl); showToast('Lien copié !') }}>
              <Link className="w-4 h-4" /> Copier le lien
            </Button>
          )}
          <Button variant={profile?.portfolio_public ? 'secondary' : 'outline'} onClick={togglePublic}>
            <Eye className="w-4 h-4" /> {profile?.portfolio_public ? 'Public' : 'Rendre public'}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Ajouter une miniature
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {profile?.portfolio_public && portfolioUrl && (
        <div className="mb-5 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
          <Eye className="w-4 h-4 text-green-400" />
          <p className="text-sm text-green-300">Votre portfolio est public : <a href={portfolioUrl} target="_blank" className="underline font-medium">{portfolioUrl}</a></p>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="aspect-video bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-[#111111] rounded-xl border border-white/5">
          <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">Votre portfolio est vide</p>
          <p className="text-sm text-gray-500 mt-1">Ajoutez vos meilleures miniatures pour impressionner vos prospects</p>
          <Button className="mt-4" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Ajouter une miniature
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="group relative bg-[#111111] rounded-xl border border-white/5 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="aspect-video bg-white/5 overflow-hidden">
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="p-3">
                <p className="font-semibold text-white text-sm">{item.title}</p>
                {item.client_name && <p className="text-xs text-gray-500">{item.client_name}</p>}
                {item.category && <p className="text-xs text-red-400 mt-0.5">{NICHE_LABELS[item.category] || item.category}</p>}
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Ajouter une miniature" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Titre *</label>
            <input type="text" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="Miniature Gaming"
              value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">URL de l'image *</label>
            <input type="url" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="https://..."
              value={newItem.image_url} onChange={e => setNewItem(p => ({ ...p, image_url: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">URL avant (optionnel)</label>
            <input type="url" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="Image avant traitement"
              value={newItem.before_image_url} onChange={e => setNewItem(p => ({ ...p, before_image_url: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Client</label>
              <input type="text" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="@chaîne"
                value={newItem.client_name} onChange={e => setNewItem(p => ({ ...p, client_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Catégorie</label>
              <select className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white"
                value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}>
                <option value="">Choisir...</option>
                {Object.entries(NICHE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button onClick={addItem} loading={saving} disabled={!newItem.title || !newItem.image_url}>Ajouter</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
