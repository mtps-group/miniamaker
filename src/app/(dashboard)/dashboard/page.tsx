'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, Briefcase, DollarSign, Clock, Search, TrendingUp,
  ArrowRight, AlertCircle, CheckCircle, Bell, Flame
} from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import { useSupabase } from '@/providers/SupabaseProvider'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatRelativeDate } from '@/lib/utils'
import { PLANS, PROSPECT_STATUSES } from '@/lib/constants'

interface DashboardStats {
  totalProspects: number
  prospectsByStatus: Record<string, number>
  activeClients: number
  revenueThisMonth: number
  revenueGoal: number
  pendingDeliverables: number
  overdueDeliverables: number
  recentActivities: Array<{ id: string; type: string; description: string; created_at: string }>
  notifications: Array<{ id: string; title: string; body: string | null; type: string; created_at: string }>
}

export default function DashboardPage() {
  const { user, profile } = useSupabase()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { if (user) fetchStats() }, [user])

  const fetchStats = async () => {
    if (!user) return
    try {
      const [prospectsRes, clientsRes, deliverablesRes, revenueRes, activitiesRes, notificationsRes, goalRes] =
        await Promise.all([
          supabase.from('prospects').select('status').eq('user_id', user.id),
          supabase.from('clients').select('id').eq('user_id', user.id).eq('is_active', true),
          supabase.from('deliverables').select('status, due_date').eq('user_id', user.id).neq('status', 'livre'),
          supabase.from('revenue_entries').select('amount, status').eq('user_id', user.id)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .eq('status', 'paid'),
          supabase.from('prospect_activities').select('id, type, description, created_at')
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
          supabase.from('notifications').select('id, title, body, type, created_at')
            .eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
          supabase.from('revenue_goals').select('target_amount').eq('user_id', user.id)
            .eq('month', new Date().getMonth() + 1).eq('year', new Date().getFullYear()).single(),
        ])

      const prospects = prospectsRes.data || []
      const prospectsByStatus: Record<string, number> = {}
      PROSPECT_STATUSES.forEach(s => { prospectsByStatus[s.value] = 0 })
      prospects.forEach(p => { prospectsByStatus[p.status] = (prospectsByStatus[p.status] || 0) + 1 })

      const deliverables = deliverablesRes.data || []
      const today = new Date().toISOString().split('T')[0]
      const revenueThisMonth = (revenueRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0)

      setStats({
        totalProspects: prospects.length,
        prospectsByStatus,
        activeClients: clientsRes.data?.length || 0,
        revenueThisMonth,
        revenueGoal: goalRes.data?.target_amount || 0,
        pendingDeliverables: deliverables.filter(d => d.status !== 'livre').length,
        overdueDeliverables: deliverables.filter(d => d.due_date && d.due_date < today).length,
        recentActivities: activitiesRes.data || [],
        notifications: notificationsRes.data || [],
      })
    } finally {
      setLoading(false)
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'là'

  const statCards = [
    {
      icon: <Users className="w-5 h-5 text-red-400" />,
      label: 'Prospects',
      value: stats?.totalProspects ?? 0,
      sub: `${stats?.prospectsByStatus['negociation'] || 0} en négociation`,
      href: '/prospects',
      accent: 'from-red-600/20 to-red-800/5 border-red-500/20',
    },
    {
      icon: <Briefcase className="w-5 h-5 text-blue-400" />,
      label: 'Clients actifs',
      value: stats?.activeClients ?? 0,
      sub: `${stats?.pendingDeliverables || 0} livrables en cours`,
      href: '/clients',
      accent: 'from-blue-600/20 to-blue-800/5 border-blue-500/20',
    },
    {
      icon: <DollarSign className="w-5 h-5 text-green-400" />,
      label: 'Revenus ce mois',
      value: formatCurrency(stats?.revenueThisMonth ?? 0),
      sub: stats?.revenueGoal ? `Objectif: ${formatCurrency(stats.revenueGoal)}` : 'Définir un objectif',
      href: '/revenus',
      accent: 'from-green-600/20 to-green-800/5 border-green-500/20',
      isRevenue: true,
    },
    {
      icon: <Clock className="w-5 h-5 text-orange-400" />,
      label: 'Livrables en attente',
      value: stats?.pendingDeliverables ?? 0,
      sub: stats?.overdueDeliverables ? `⚠️ ${stats.overdueDeliverables} en retard` : 'Tous à jour',
      href: '/clients',
      accent: 'from-orange-600/20 to-orange-800/5 border-orange-500/20',
      isWarning: !!stats?.overdueDeliverables,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-black text-white">
          Bonjour, {firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1">Voici un aperçu de votre activité</p>
      </motion.div>

      {/* Plan Banner */}
      {profile?.plan === 'free' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-4 bg-gradient-to-r from-red-900/20 to-transparent border border-red-500/20 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Vous êtes sur le plan Gratuit</p>
              <p className="text-xs text-gray-500">Passez au Pro pour débloquer le pipeline, les clients et les exports</p>
            </div>
          </div>
          <Button size="sm" onClick={() => window.location.href = '/abonnement'}>
            Passer au Pro →
          </Button>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading
          ? [...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111111] border border-white/5 rounded-2xl p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))
          : statCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={card.href}
                className={`block bg-gradient-to-br ${card.accent} border rounded-2xl p-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-200`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    {card.icon}
                  </div>
                </div>
                <p className="text-2xl font-black text-white">{card.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                {card.isRevenue && stats?.revenueGoal && stats.revenueThisMonth !== undefined && (
                  <div className="mt-2">
                    <ProgressBar value={stats.revenueThisMonth} max={stats.revenueGoal} color="red" />
                  </div>
                )}
                <p className={`text-xs mt-1.5 ${card.isWarning ? 'text-red-400' : 'text-gray-600'}`}>{card.sub}</p>
              </Link>
            </motion.div>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline */}
        <div className="lg:col-span-2">
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white">Pipeline de prospects</h2>
              <Link href="/prospects" className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2.5">
                {PROSPECT_STATUSES.filter(s => s.value !== 'perdu').map(status => {
                  const count = stats?.prospectsByStatus[status.value] || 0
                  const maxCount = Math.max(...Object.values(stats?.prospectsByStatus || {}), 1)
                  return (
                    <div key={status.value} className="flex items-center gap-3">
                      <span className="text-base w-6">{status.emoji}</span>
                      <span className="text-sm text-gray-400 w-28">{status.label}</span>
                      <div className="flex-1">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / maxCount) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full"
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white w-6 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
              <Link href="/recherche" className="flex items-center gap-3 p-3 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 rounded-xl transition-all duration-200 group">
                <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:shadow-red-600/50 transition-shadow">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Nouvelle recherche</p>
                  <p className="text-xs text-gray-500">Trouver des prospects</p>
                </div>
              </Link>
              <Link href="/analyse" className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 hover:bg-white/8 rounded-xl transition-all duration-200 group">
                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-red-600/20 transition-colors">
                  <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Analyser une chaîne</p>
                  <p className="text-xs text-gray-500">Score miniatures IA</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {!loading && stats && (stats.overdueDeliverables > 0 || stats.notifications.length > 0) && (
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-4">
              <h2 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4 text-red-400" /> Alertes
              </h2>
              <div className="space-y-2">
                {stats.overdueDeliverables > 0 && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-300">{stats.overdueDeliverables} livrable(s) en retard</p>
                      <Link href="/clients" className="text-xs text-red-500 hover:underline">Voir les livrables</Link>
                    </div>
                  </div>
                )}
                {stats.notifications.slice(0, 3).map(notif => (
                  <div key={notif.id} className="flex items-start gap-2.5 p-3 bg-white/5 border border-white/8 rounded-xl">
                    <Bell className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-300">{notif.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#111111] border border-white/5 rounded-2xl p-4">
            <h2 className="font-bold text-white mb-3 text-sm">Activité récente</h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recentActivities.length ? (
              <div className="space-y-3">
                {stats.recentActivities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-red-600/20 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-300 line-clamp-2">{activity.description}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatRelativeDate(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center py-6">Aucune activité récente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
