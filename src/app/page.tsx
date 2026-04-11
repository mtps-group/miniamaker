'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import Link from 'next/link'
import {
  Search, Users, TrendingUp, DollarSign, ImageIcon,
  CheckCircle, ArrowRight, Star, Zap, Crown, Play,
  Target, Bell, ChevronRight, Flame
} from 'lucide-react'

// ─── CountUp Hook ──────────────────────────────────────────
function CountUp({ to, duration = 2, suffix = '', prefix = '' }: { to: number; duration?: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const motionVal = useMotionValue(0)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!isInView) return
    const controls = animate(motionVal, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString('fr-FR')),
    })
    return controls.stop
  }, [isInView, to, duration, motionVal])

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

// ─── Floating Particle ──────────────────────────────────────
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full bg-red-500/20 pointer-events-none"
      style={style}
    />
  )
}

// ─── Feature variants ───────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const }
  })
}

// ─── Main Component ─────────────────────────────────────────
export default function LandingPage() {
  const particles = [
    { width: 4, height: 4, left: '10%', top: '20%', animation: 'float 7s ease-in-out infinite' },
    { width: 6, height: 6, left: '80%', top: '15%', animation: 'float 9s ease-in-out infinite 2s' },
    { width: 3, height: 3, left: '60%', top: '70%', animation: 'float 6s ease-in-out infinite 1s' },
    { width: 5, height: 5, left: '25%', top: '80%', animation: 'float 8s ease-in-out infinite 3s' },
    { width: 4, height: 4, left: '90%', top: '50%', animation: 'float 7s ease-in-out infinite 0.5s' },
    { width: 3, height: 3, left: '45%', top: '30%', animation: 'float 10s ease-in-out infinite 4s' },
  ]

  const features = [
    {
      icon: <Search className="w-6 h-6 text-red-400" />,
      title: 'Recherche intelligente',
      desc: 'Filtrez par abonnés, niche, pays, fréquence d\'upload. Trouvez les chaînes qui ont le plus besoin de vous en 2 minutes.'
    },
    {
      icon: <ImageIcon className="w-6 h-6 text-red-400" />,
      title: 'Analyse IA des miniatures',
      desc: 'Notre IA analyse composition, couleurs, texte et génère un score prospect + un pitch personnalisé pour chaque chaîne.'
    },
    {
      icon: <Users className="w-6 h-6 text-red-400" />,
      title: 'Pipeline CRM complet',
      desc: 'Gérez vos prospects de la découverte à la signature. Rappels de relance, notes, valeur estimée, timeline d\'activité.'
    },
    {
      icon: <Target className="w-6 h-6 text-red-400" />,
      title: 'Score prospect 0-100',
      desc: 'Algorithme sur 6 critères : abonnés, qualité miniatures, fréquence, niche, ratio vues/abonnés, cohérence visuelle.'
    },
    {
      icon: <DollarSign className="w-6 h-6 text-red-400" />,
      title: 'Suivi des revenus',
      desc: 'Suivez vos paiements, fixez des objectifs mensuels, visualisez votre progression avec des graphiques clairs.'
    },
    {
      icon: <Star className="w-6 h-6 text-red-400" />,
      title: 'Portfolio public',
      desc: 'Créez votre vitrine avec vos meilleures miniatures. Partagez un lien pour convaincre vos prospects en un clic.'
    },
  ]

  const steps = [
    { num: '01', title: 'Recherchez', desc: 'Tapez un mot-clé, appliquez vos filtres. MiniaMaker analyse des milliers de chaînes en quelques secondes.' },
    { num: '02', title: 'Scorez', desc: 'Chaque chaîne reçoit un score de 0 à 100. Plus le score est élevé, plus elle a besoin de vous.' },
    { num: '03', title: 'Prospectez', desc: 'Ajoutez les meilleures au pipeline CRM, envoyez vos templates personnalisés et convertissez.' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* ── NAVBAR ──────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40 group-hover:shadow-red-600/60 transition-shadow">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-white">MiniaMaker</span>
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Fonctionnalités</Link>
            <Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Tarifs</Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Connexion</Link>
          </div>

          <Link
            href="/signup"
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5"
          >
            Commencer gratuitement <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 overflow-hidden">

        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-[600px] h-[600px] rounded-full animate-pulse-glow"
            style={{
              background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)',
              top: '-100px', left: '-100px', filter: 'blur(60px)'
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full animate-pulse-glow"
            style={{
              background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
              bottom: '0px', right: '-50px', filter: 'blur(80px)',
              animationDelay: '1.5s'
            }}
          />
          <div
            className="absolute w-[300px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)',
              top: '30%', right: '20%', filter: 'blur(60px)'
            }}
          />
        </div>

        {/* Floating particles */}
        {particles.map((p, i) => (
          <Particle key={i} style={{ width: p.width, height: p.height, left: p.left, top: p.top, animation: p.animation }} />
        ))}

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/5 text-red-400 text-sm font-medium">
              <Flame className="w-3.5 h-3.5" />
              La plateforme #1 pour les miniamakers YouTube
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1" />
            </div>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6"
          >
            <span className="text-white">Trouvez des clients</span>
            <br />
            <span className="text-gradient-red">YouTube qui ont</span>
            <br />
            <span className="text-white">besoin de </span>
            <span className="relative inline-block">
              <span className="text-gradient-red">vous</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M0 6 Q100 0 200 6" stroke="url(#redGrad)" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Recherchez des chaînes YouTube avec de mauvaises miniatures, analysez leur potentiel avec notre IA, prospectez et gérez vos clients — tout en un seul outil.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <Link
              href="/signup"
              className="group flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-2xl shadow-red-600/40 hover:shadow-red-600/60 hover:-translate-y-1 text-base"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 text-gray-300 hover:text-white font-medium px-6 py-4 rounded-2xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200 text-base"
            >
              Voir les fonctionnalités
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-600"
          >
            ✓ Aucune carte de crédit · ✓ 3 recherches gratuites · ✓ Annulable à tout moment
          </motion.p>

          {/* Hero mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 relative max-w-4xl mx-auto animate-float"
          >
            {/* Glow behind card */}
            <div className="absolute inset-0 bg-red-500/10 rounded-3xl blur-3xl -z-10 scale-95" />

            <div className="gradient-border overflow-hidden shadow-2xl">
              {/* Fake topbar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d0d] border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                  <div className="w-3 h-3 rounded-full bg-green-500/40" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-white/5 rounded-lg text-xs text-gray-500">app.miniamaker.com/recherche</div>
                </div>
              </div>

              {/* Fake dashboard */}
              <div className="bg-[#0f0f0f] p-4 grid grid-cols-12 gap-3" style={{ minHeight: 280 }}>
                {/* Sidebar mini */}
                <div className="col-span-2 hidden sm:flex flex-col gap-1.5">
                  {['Dashboard', 'Recherche', 'Prospects', 'Analyse', 'Clients'].map((item, i) => (
                    <div
                      key={item}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${i === 1 ? 'bg-red-600 text-white' : 'text-gray-500'}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="col-span-12 sm:col-span-10 space-y-3">
                  {/* Search bar */}
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-gray-600" />
                      gaming, vlog, finance...
                    </div>
                    <div className="px-4 py-2 bg-red-600 rounded-xl text-xs text-white font-medium">Rechercher</div>
                  </div>

                  {/* Fake channel cards */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'TechVision', subs: '127K', score: 87, color: 'text-red-400' },
                      { name: 'FinanceHub', subs: '45K', score: 92, color: 'text-red-400' },
                      { name: 'GamingPro', subs: '89K', score: 74, color: 'text-yellow-400' },
                      { name: 'VlogLife', subs: '32K', score: 68, color: 'text-yellow-400' },
                    ].map((ch) => (
                      <div key={ch.name} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600/30 to-red-800/30 border border-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-400">
                            {ch.name[0]}
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-white">{ch.name}</p>
                            <p className="text-[10px] text-gray-500">{ch.subs} abonnés</p>
                          </div>
                        </div>
                        <div className={`text-sm font-black ${ch.color}`}>{ch.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────── */}
      <section className="py-20 border-t border-white/5 relative">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { to: 500, suffix: 'M+', label: 'Chaînes YouTube analysables' },
            { to: 2, suffix: 'min', label: 'Pour trouver 50 prospects ciblés' },
            { to: 6, suffix: ' critères', label: 'Pour scorer chaque chaîne' },
            { to: 100, suffix: '%', label: 'Axé miniamakers' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-4xl font-black text-red-500 mb-1 animate-number-glow">
                <CountUp to={stat.to} suffix={stat.suffix} />
              </p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────── */}
      <section className="py-24 px-4 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-red-500 text-sm font-semibold uppercase tracking-widest">Comment ça marche</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-3 text-white">3 étapes pour trouver vos clients</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="absolute top-12 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent hidden md:block" />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative text-center"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 relative">
                  <div className="absolute inset-0 bg-red-600/10 rounded-2xl border border-red-500/20" />
                  <span className="text-3xl font-black text-gradient-red relative z-10">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────── */}
      <section id="features" className="py-24 px-4 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/5 to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-red-500 text-sm font-semibold uppercase tracking-widest">Fonctionnalités</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-3 text-white">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Une plateforme complète pour trouver, convertir et fidéliser vos clients YouTube</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariants}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative bg-[#111111] border border-white/5 rounded-2xl p-6 cursor-default overflow-hidden"
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                <div className="absolute inset-0 border border-red-500/0 group-hover:border-red-500/20 rounded-2xl transition-colors duration-300" />

                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-5 group-hover:bg-red-600/20 transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f0005] to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-red-500 text-sm font-semibold uppercase tracking-widest">Tarifs</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-3 text-white">Commencez gratuitement</h2>
            <p className="text-gray-500 mt-4">Passez au niveau supérieur quand vous êtes prêt</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Gratuit',
                icon: <Zap className="w-5 h-5 text-gray-400" />,
                price: '0€',
                period: '',
                features: ['3 recherches à vie', '3 résultats visibles', '5 prospects max', 'Score prospect'],
                cta: 'Commencer gratuitement',
                popular: false,
                highlighted: false,
              },
              {
                name: 'Pro',
                icon: <Star className="w-5 h-5 text-red-400" />,
                price: '29.99€',
                period: '/mois',
                features: ['Recherches illimitées', 'Pipeline CRM complet', 'Gestion clients & livrables', 'Templates outreach IA', 'Exports CSV & Sheets'],
                cta: 'Passer au Pro',
                popular: true,
                highlighted: true,
              },
              {
                name: 'Business',
                icon: <Crown className="w-5 h-5 text-yellow-400" />,
                price: '59.99€',
                period: '/mois',
                features: ['Tout le plan Pro', 'Analyse IA miniatures', 'Portfolio public', 'Suivi des revenus', 'Alertes & tendances'],
                cta: 'Passer au Business',
                popular: false,
                highlighted: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.highlighted
                    ? 'bg-[#130000] border border-red-500/40 shadow-2xl shadow-red-500/10 animate-border-glow'
                    : 'bg-[#111111] border border-white/5'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-red-600/40">
                      ⚡ Populaire
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  {plan.icon}
                  <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                </div>

                <div className="mb-6">
                  <span className={`text-4xl font-black ${plan.highlighted ? 'text-red-400' : 'text-white'}`}>
                    {plan.price}
                  </span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-gray-400">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-red-500' : 'text-green-500/70'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`block text-center font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 ${
                    plan.highlighted
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5'
                      : 'border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────── */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 via-red-900/10 to-red-950/30" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.12) 0%, transparent 70%)'
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/5 text-red-400 text-sm font-medium mb-8">
            <Bell className="w-3.5 h-3.5" />
            Rejoignez des centaines de miniamakers
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
            Prêt à développer<br />
            <span className="text-gradient-red">votre activité ?</span>
          </h2>

          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Commencez gratuitement aujourd'hui. Aucune carte de crédit requise.
          </p>

          <Link
            href="/signup"
            className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all duration-300 shadow-2xl shadow-red-600/40 hover:shadow-red-600/60 hover:-translate-y-1"
          >
            Commencer gratuitement
            <ArrowRight className="w-5 h-5" />
          </Link>

          <p className="text-gray-600 text-sm mt-4">
            ✓ 3 recherches gratuites · ✓ Sans engagement · ✓ Setup en 2 minutes
          </p>
        </motion.div>
      </section>

      {/* ── FOOTER ──────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-white">MiniaMaker</span>
          </div>
          <p className="text-sm text-gray-600">© 2026 MiniaMaker · Fait pour les miniamakers YouTube</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-400 transition-colors">Confidentialité</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-400 transition-colors">Connexion</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
