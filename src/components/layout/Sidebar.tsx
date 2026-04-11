'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Search, Users, ImageIcon, Briefcase,
  Palette, DollarSign, Send, Eye, Settings, CreditCard,
  LogOut, X, Play, Zap, Star, Crown,
} from 'lucide-react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navSections = [
  {
    label: 'PRINCIPAL',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/recherche', label: 'Recherche', icon: Search },
      { href: '/prospects', label: 'Prospects', icon: Users },
      { href: '/analyse', label: 'Analyse', icon: ImageIcon },
    ],
  },
  {
    label: 'GESTION',
    items: [
      { href: '/clients', label: 'Clients', icon: Briefcase },
      { href: '/portfolio', label: 'Portfolio', icon: Palette },
      { href: '/revenus', label: 'Revenus', icon: DollarSign },
      { href: '/outreach', label: 'Outreach', icon: Send },
    ],
  },
  {
    label: 'AUTRE',
    items: [
      { href: '/veille', label: 'Veille', icon: Eye },
      { href: '/parametres', label: 'Paramètres', icon: Settings },
      { href: '/abonnement', label: 'Abonnement', icon: CreditCard },
    ],
  },
]

const planConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  free: {
    label: 'Gratuit',
    icon: <Zap className="w-3 h-3" />,
    color: 'text-gray-400',
    bg: 'bg-gray-700/40',
  },
  pro: {
    label: 'Pro',
    icon: <Star className="w-3 h-3" />,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
  },
  business: {
    label: 'Business',
    icon: <Crown className="w-3 h-3" />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
  },
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useSupabase()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const plan = planConfig[profile?.plan ?? 'free'] ?? planConfig.free

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[260px]
          bg-[#0d0d0d] border-r border-white/5
          flex flex-col transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:shadow-red-600/50 transition-shadow">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">MiniaMaker</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-700">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`
                          group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                          transition-all duration-150 relative overflow-hidden
                          ${
                            active
                              ? 'bg-red-600/15 text-red-400 border border-red-500/20'
                              : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                          }
                        `}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500 rounded-r-full" />
                        )}
                        <Icon
                          className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                            active ? 'text-red-500' : 'text-gray-600 group-hover:text-gray-300'
                          }`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-sm font-black text-red-400 uppercase flex-shrink-0">
              {profile?.full_name
                ? profile.full_name.charAt(0)
                : profile?.email?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {profile?.full_name || profile?.email || 'Utilisateur'}
              </p>
              <span
                className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${plan.bg} ${plan.color}`}
              >
                {plan.icon}
                {plan.label}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
