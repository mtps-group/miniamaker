'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Settings, User, ExternalLink, LogOut } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useSupabase } from '@/providers/SupabaseProvider'
import { useToast } from '@/providers/ToastProvider'
import { createClient } from '@/lib/supabase/client'

export default function ParametresPage() {
  const { user, profile, refreshProfile } = useSupabase()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const supabase = createClient()

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
      await refreshProfile()
      showToast('Profil mis à jour !')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 bg-[#1a1a1a] border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Paramètres</h1>
        <p className="text-gray-500 mt-1">Gérez vos préférences et votre compte</p>
      </div>

      {/* Profile */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 mb-4">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-red-400" /> Profil
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Nom complet</label>
            <input
              type="text"
              className={inputClass}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              className={`${inputClass} opacity-50 cursor-not-allowed`}
              value={user?.email || ''}
              disabled
            />
            <p className="text-xs text-gray-600 mt-1">L'email ne peut pas être modifié ici</p>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={saveProfile} loading={saving}>Enregistrer</Button>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 mb-4">
        <h2 className="font-bold text-white mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-red-400" /> Abonnement
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">
              Plan {profile?.plan === 'free' ? 'Gratuit' : profile?.plan === 'pro' ? 'Pro' : 'Business'}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {profile?.total_searches_used || 0} recherches utilisées
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/abonnement'}>
            Gérer <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#111111] border border-red-500/20 rounded-2xl p-5">
        <h2 className="font-bold text-red-400 mb-3">Zone de danger</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">Déconnexion</p>
            <p className="text-xs text-gray-600">Terminer votre session actuelle</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
          >
            <LogOut className="w-3.5 h-3.5" /> Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  )
}
