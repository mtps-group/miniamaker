'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Send, Copy, Lock, Trash2, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/providers/ToastProvider'
import { useSupabase } from '@/providers/SupabaseProvider'
import { PLANS } from '@/lib/constants'
import { formatRelativeDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { OutreachTemplate, OutreachType } from '@/types'

export default function OutreachPage() {
  const { user, profile } = useSupabase()
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<OutreachTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '', type: 'email' as OutreachType })
  const supabase = createClient()
  const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]
  const canUse = plan.hasOutreach

  useEffect(() => {
    if (!user) return
    supabase.from('outreach_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setTemplates(data || []); setLoading(false) })
  }, [user])

  const saveTemplate = async () => {
    setSaving(true)
    const { data, error } = await supabase.from('outreach_templates')
      .insert({ ...newTemplate, user_id: user?.id, variables: [] })
      .select().single()
    setSaving(false)
    if (!error && data) {
      setTemplates(prev => [data, ...prev])
      setShowAddModal(false)
      setNewTemplate({ name: '', subject: '', body: '', type: 'email' })
      showToast('Template créé !')
    }
  }

  const deleteTemplate = async (id: string) => {
    await supabase.from('outreach_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    showToast('Template supprimé')
  }

  const copyTemplate = (body: string) => {
    navigator.clipboard.writeText(body)
    showToast('Copié dans le presse-papiers !')
  }

  const TYPE_LABELS: Record<string, string> = { email: 'Email', dm: 'DM YouTube', twitter: 'Twitter/X', discord: 'Discord' }

  if (!canUse) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-white">Templates d'outreach</h1></div>
        <div className="text-center py-20 bg-[#111111] rounded-xl border border-white/5">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-300 mb-2">Fonctionnalité Pro</p>
          <p className="text-sm text-gray-400 mb-4">Les templates de prospection sont disponibles sur le plan Pro</p>
          <Button onClick={() => window.location.href = '/abonnement'}>Passer au plan Pro →</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates d'outreach</h1>
          <p className="text-gray-400 mt-1">Vos messages de prospection personnalisables</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> Nouveau template
        </Button>
      </div>

      {/* Default Templates */}
      <div className="bg-red-500/10 border border-red-200 rounded-xl p-4 mb-5">
        <p className="text-sm font-medium text-red-300 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Templates recommandés
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'Pitch court (email)', type: 'email', body: `Bonjour [Prénom],\n\nJe suis tombé sur votre chaîne [Nom de la chaîne] et j'ai remarqué que vos miniatures pourraient être optimisées pour augmenter votre taux de clic.\n\nJe suis spécialiste en création de miniatures YouTube. Voici mon portfolio : [Lien]\n\nSeriez-vous intéressé par une miniature test gratuite ?\n\nCordialement,\n[Votre nom]` },
            { name: 'DM YouTube', type: 'dm', body: `Salut [Prénom] ! 👋\n\nJ'adore votre contenu sur [Niche]. J'ai remarqué que vos miniatures pourraient être retravaillées pour booster votre CTR.\n\nJe crée des miniatures depuis X ans. Vous voulez qu'on en discute ?\n\n[Votre nom]` },
          ].map((t, i) => (
            <div key={i} className="bg-[#111111] rounded-lg border border-red-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-200">{t.name}</span>
                <Badge variant="info" size="sm">{TYPE_LABELS[t.type]}</Badge>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mb-2">{t.body.slice(0, 100)}...</p>
              <Button size="sm" variant="outline" onClick={() => copyTemplate(t.body)}>
                <Copy className="w-3.5 h-3.5" /> Copier
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* User Templates */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-200">Mes templates</h2>
          {templates.map(template => (
            <div key={template.id} className="bg-[#111111] rounded-xl border border-white/5 shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    <Badge variant="default" size="sm">{TYPE_LABELS[template.type]}</Badge>
                  </div>
                  {template.subject && <p className="text-xs text-gray-400 mt-0.5">Sujet: {template.subject}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyTemplate(template.body)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteTemplate(template.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-400 whitespace-pre-line line-clamp-3">{template.body}</p>
              <p className="text-xs text-gray-400 mt-2">{formatRelativeDate(template.created_at)} · {template.use_count} utilisation(s)</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Template Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nouveau template" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nom du template *</label>
              <input type="text" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="Mon pitch email"
                value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select className="w-full px-3 py-2 border border-white/8 rounded-lg text-sm bg-[#111111]"
                value={newTemplate.type} onChange={e => setNewTemplate(p => ({ ...p, type: e.target.value as OutreachType }))}>
                <option value="email">Email</option>
                <option value="dm">DM YouTube</option>
                <option value="twitter">Twitter/X</option>
                <option value="discord">Discord</option>
              </select>
            </div>
          </div>
          {newTemplate.type === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sujet de l'email</label>
              <input type="text" className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-lg text-sm text-white" placeholder="Je peux doubler votre CTR"
                value={newTemplate.subject} onChange={e => setNewTemplate(p => ({ ...p, subject: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Corps du message *</label>
            <textarea rows={8} className="w-full px-3 py-2 border border-white/8 rounded-lg text-sm resize-none" placeholder="Votre message..."
              value={newTemplate.body} onChange={e => setNewTemplate(p => ({ ...p, body: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Utilisez [Prénom], [Nom de la chaîne] comme variables</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button onClick={saveTemplate} loading={saving} disabled={!newTemplate.name || !newTemplate.body}>Créer le template</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
