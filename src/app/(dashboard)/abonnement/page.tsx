'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Check, Zap, Star, Crown } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useSupabase } from '@/providers/SupabaseProvider'
import { useToast } from '@/providers/ToastProvider'
import { PLANS } from '@/lib/constants'

const PLAN_FEATURES = {
  free: [
    '3 recherches à vie',
    '3 résultats visibles par recherche',
    '5 prospects maximum',
    'Score prospect automatique',
  ],
  pro: [
    'Recherches illimitées',
    '50 résultats par recherche',
    'Prospects illimités',
    'Pipeline CRM Kanban',
    'Gestion des clients & livrables',
    'Templates de prospection IA',
    'Exports CSV, Google Sheets, Notion',
    'Recherches sauvegardées',
  ],
  business: [
    'Tout le plan Pro',
    'Analyse IA des miniatures',
    'Score de qualité par vidéo',
    'Rapport d\'analyse complet',
    'Portfolio public partageable',
    'Suivi des revenus & objectifs',
    'Alertes & tendances par niche',
    'Génération de pitch personnalisé',
  ],
}

const PLAN_ICONS = {
  free: <Zap className="w-5 h-5 text-gray-500" />,
  pro: <Star className="w-5 h-5 text-red-400" />,
  business: <Crown className="w-5 h-5 text-red-400" />,
}

const PLAN_COLORS = {
  free: 'border-white/5',
  pro: 'border-red-500 ring-2 ring-red-500/10',
  business: 'border-red-500 ring-2 ring-red-500/10',
}

const PLAN_BUTTON = {
  free: 'secondary' as const,
  pro: 'primary' as const,
  business: 'primary' as const,
}

export default function AbonnementPage() {
  const { profile } = useSupabase()
  const { showToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const currentPlan = profile?.plan || 'free'

  const handleSubscribe = async (planSlug: string) => {
    if (planSlug === 'free') return
    if (planSlug === currentPlan) {
      // Open customer portal
      setLoading('portal')
      try {
        const res = await fetch('/api/stripe/create-portal', { method: 'POST' })
        const data = await res.json()
        if (data.url) window.location.href = data.url
        else showToast('Erreur lors de l\'ouverture du portail', 'error')
      } finally {
        setLoading(null)
      }
      return
    }

    setLoading(planSlug)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else showToast(data.error || 'Erreur lors de la création de la session', 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white">Choisissez votre plan</h1>
        <p className="text-gray-500 mt-2">Commencez gratuitement, évoluez selon vos besoins</p>
      </div>

      {/* Current plan banner */}
      {currentPlan !== 'free' && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <p className="text-sm text-red-300">
            Vous êtes actuellement sur le plan <strong>{PLANS[currentPlan as keyof typeof PLANS]?.name}</strong>.{' '}
            <button onClick={() => handleSubscribe('portal')} className="underline font-medium">
              Gérer mon abonnement
            </button>
          </p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['free', 'pro', 'business'] as const).map(planSlug => {
          const plan = PLANS[planSlug]
          const features = PLAN_FEATURES[planSlug]
          const isCurrent = currentPlan === planSlug
          const isPopular = planSlug === 'pro'

          return (
            <div
              key={planSlug}
              className={`relative bg-[#111111] rounded-2xl border shadow-sm p-6 flex flex-col ${PLAN_COLORS[planSlug]}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Populaire</span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                {PLAN_ICONS[planSlug]}
                <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                {isCurrent && <Badge variant="success" size="sm">Actuel</Badge>}
              </div>

              {/* Price */}
              <div className="mb-5">
                {plan.priceMonthly === 0 ? (
                  <p className="text-3xl font-black text-white">Gratuit</p>
                ) : (
                  <div>
                    <span className="text-3xl font-black text-white">{plan.priceMonthly}€</span>
                    <span className="text-gray-500 text-sm">/mois</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${planSlug === 'free' ? 'text-gray-500' : planSlug === 'pro' ? 'text-red-400' : 'text-red-400'}`} />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant={isCurrent ? 'secondary' : PLAN_BUTTON[planSlug]}
                className="w-full"
                onClick={() => handleSubscribe(planSlug)}
                loading={loading === planSlug || loading === 'portal'}
                disabled={planSlug === 'free' && currentPlan === 'free'}
              >
                {isCurrent
                  ? 'Gérer mon abonnement'
                  : planSlug === 'free'
                    ? 'Plan actuel'
                    : `Passer au ${plan.name}`}
              </Button>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          Des questions ? Contactez-nous à{' '}
          <a href="mailto:support@miniamaker.fr" className="text-red-400 hover:underline">
            support@miniamaker.fr
          </a>
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Paiement sécurisé par Stripe · Annulez à tout moment · Sans engagement
        </p>
      </div>
    </div>
  )
}
