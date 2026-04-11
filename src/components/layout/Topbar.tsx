'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, Bell, LogOut, User, Settings } from 'lucide-react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface TopbarProps {
  onMenuClick: () => void
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recherche': 'Recherche',
  '/prospects': 'Prospects',
  '/analyse': 'Analyse IA',
  '/clients': 'Clients',
  '/portfolio': 'Portfolio',
  '/revenus': 'Revenus',
  '/outreach': 'Outreach',
  '/veille': 'Veille',
  '/parametres': 'Paramètres',
  '/abonnement': 'Abonnement',
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useSupabase()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const pageTitle =
    Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] ?? 'Dashboard'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#0d0d0d] border-b border-white/5">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-xl text-gray-600 hover:text-white hover:bg-white/8 transition-all"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-white">{pageTitle}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-gray-600 hover:text-white hover:bg-white/8 transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/8 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-sm font-black text-red-400 uppercase">
              {profile?.full_name
                ? profile.full_name.charAt(0)
                : profile?.email?.charAt(0) ?? '?'}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#151515] border border-white/8 rounded-2xl shadow-2xl shadow-black/50 py-2 animate-scale-up overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm font-semibold text-white truncate">
                  {profile?.full_name || 'Utilisateur'}
                </p>
                <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/parametres"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Mon profil
                </Link>
                <Link
                  href="/parametres"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Paramètres
                </Link>
              </div>
              <div className="border-t border-white/5 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
