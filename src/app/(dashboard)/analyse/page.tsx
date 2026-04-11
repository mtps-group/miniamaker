'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, ImageIcon, Star, Eye, Target, Smile, Palette, AlignLeft, Lock, Wand2, Download, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import ProgressBar from '@/components/ui/ProgressBar'
import { useSupabase } from '@/providers/SupabaseProvider'
import { useToast } from '@/providers/ToastProvider'
import { PLANS, NICHE_LABELS } from '@/lib/constants'
import { formatNumber, getYouTubeThumbnailUrl } from '@/lib/utils'

interface AnalysisResult {
  channelName: string
  channelAvatar: string
  channelId: string
  subscriberCount: number
  overallScore: number
  consistency: number
  thumbnails: Array<{
    videoId: string
    title: string
    viewCount: number
    thumbnailUrl: string
    score: number
    composition: number
    textReadability: number
    colorContrast: number
    facePresence: boolean
    feedback: string
  }>
}

const STYLES = [
  { value: 'impactant', label: 'Impactant' },
  { value: 'minimaliste', label: 'Minimaliste' },
  { value: 'coloré et vibrant', label: 'Coloré' },
  { value: 'professionnel et épuré', label: 'Pro & Épuré' },
  { value: 'dramatique et cinématique', label: 'Cinématique' },
  { value: 'fun et humoristique', label: 'Fun' },
]

const COLORS = [
  { value: 'rouge et noir', label: 'Rouge & Noir' },
  { value: 'bleu et blanc', label: 'Bleu & Blanc' },
  { value: 'jaune et noir', label: 'Jaune & Noir' },
  { value: 'vert et noir', label: 'Vert & Noir' },
  { value: 'orange et noir', label: 'Orange & Noir' },
  { value: 'violet et doré', label: 'Violet & Or' },
]

const MODELS = [
  { value: 'black-forest-labs/flux-schnell', label: 'Flux Schnell (rapide)' },
  { value: 'black-forest-labs/flux-1.1-pro', label: 'Flux 1.1 Pro (qualité)' },
  { value: 'openai/dall-e-3', label: 'DALL-E 3' },
]

export default function AnalysePage() {
  const searchParams = useSearchParams()
  const { profile } = useSupabase()
  const { showToast } = useToast()
  const [channelUrl, setChannelUrl] = useState(searchParams.get('channelId') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]
  const canAnalyze = plan.hasAnalysis

  // Generation state
  const [showGenerator, setShowGenerator] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [genForm, setGenForm] = useState({
    videoTitle: '',
    niche: '',
    style: 'impactant',
    colors: 'rouge et noir',
    model: 'black-forest-labs/flux-schnell',
  })

  useEffect(() => {
    const channelId = searchParams.get('channelId')
    if (channelId) {
      setChannelUrl(channelId)
      handleAnalyze(channelId)
    }
  }, [])

  const handleAnalyze = async (urlOrId?: string) => {
    const target = urlOrId || channelUrl
    if (!target.trim()) return

    if (!canAnalyze) {
      showToast('Fonctionnalité réservée au plan Business', 'error')
      return
    }

    setLoading(true)
    setResult(null)
    setGeneratedImage(null)
    try {
      const res = await fetch('/api/thumbnail-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: target }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      showToast('Erreur lors de l\'analyse', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!genForm.videoTitle.trim()) {
      showToast('Entrez le titre de la vidéo', 'error')
      return
    }
    setGenerating(true)
    setGeneratedImage(null)
    try {
      const res = await fetch('/api/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: result?.channelName || '',
          videoTitle: genForm.videoTitle,
          niche: genForm.niche || NICHE_LABELS[genForm.niche] || 'général',
          style: genForm.style,
          colors: genForm.colors,
          model: genForm.model,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedImage(data.imageUrl)
    } catch {
      showToast('Erreur lors de la génération', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!generatedImage) return
    const a = document.createElement('a')
    a.href = generatedImage
    a.download = `miniature-${genForm.videoTitle.slice(0, 30).replace(/\s+/g, '-')}.png`
    a.target = '_blank'
    a.click()
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400'
    if (score >= 45) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-500/10 border-green-500/20'
    if (score >= 45) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-red-500/10 border-red-500/20'
  }

  const getProgressColor = (score: number): 'green' | 'yellow' | 'red' => {
    if (score >= 70) return 'green'
    if (score >= 45) return 'yellow'
    return 'red'
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Analyseur de miniatures</h1>
        <p className="text-gray-500 mt-1">Analysez la qualité des miniatures d'une chaîne YouTube avec l'IA</p>
      </div>

      {/* Plan gate */}
      {!canAnalyze && (
        <div className="mb-6 p-5 bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white">Fonctionnalité Business</p>
              <p className="text-sm text-gray-500">L'analyse IA et la génération de miniatures sont disponibles sur le plan Business</p>
            </div>
          </div>
          <Button onClick={() => window.location.href = '/abonnement'}>
            Passer au Business →
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="bg-[#111111] rounded-2xl border border-white/5 p-4 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={channelUrl}
              onChange={e => setChannelUrl(e.target.value)}
              placeholder="ID de chaîne YouTube, @handle ou URL..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50"
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
          <Button onClick={() => handleAnalyze()} loading={loading} disabled={!canAnalyze || !channelUrl.trim()}>
            <ImageIcon className="w-4 h-4" /> Analyser
          </Button>
        </div>
        <p className="text-xs text-gray-600 mt-2">Ex: UCxxxxxx, @mrwhosetheboss, https://youtube.com/channel/...</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-[#111111] rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-red-400 animate-pulse" />
              <p className="text-sm text-gray-400">Analyse IA en cours avec Claude Sonnet...</p>
            </div>
            <div className="flex gap-4 mb-4">
              <Skeleton className="w-16 h-16 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-5">
          {/* Channel Overview */}
          <div className="bg-[#111111] rounded-2xl border border-white/5 p-5">
            <div className="flex items-start gap-4">
              <img src={result.channelAvatar} alt={result.channelName} className="w-16 h-16 rounded-xl object-cover border border-white/8" />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{result.channelName}</h2>
                <p className="text-sm text-gray-500">{formatNumber(result.subscriberCount)} abonnés</p>
                <div className="flex gap-3 mt-3">
                  <div className={`flex-1 p-3 rounded-xl border ${getScoreBg(result.overallScore)} text-center`}>
                    <p className={`text-2xl font-black ${getScoreColor(result.overallScore)}`}>{result.overallScore}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Score global</p>
                  </div>
                  <div className={`flex-1 p-3 rounded-xl border ${getScoreBg(result.consistency)} text-center`}>
                    <p className={`text-2xl font-black ${getScoreColor(result.consistency)}`}>{result.consistency}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cohérence</p>
                  </div>
                  <div className="flex-1 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-2xl font-black text-white">{result.thumbnails.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Miniatures</p>
                  </div>
                </div>
              </div>
            </div>

            {result.overallScore < 50 && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                <Target className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-300">
                  <strong>Excellente opportunité !</strong> Les miniatures de cette chaîne ont un score bas — c'est le moment idéal pour proposer vos services.
                </p>
              </div>
            )}
          </div>

          {/* Thumbnails Grid */}
          <div>
            <h3 className="font-bold text-white mb-3">Analyse des miniatures ({result.thumbnails.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.thumbnails.map(thumb => (
                <div key={thumb.videoId} className="bg-[#111111] rounded-2xl border border-white/5 overflow-hidden hover:border-red-500/20 transition-colors">
                  <div className="relative">
                    <img
                      src={thumb.thumbnailUrl || getYouTubeThumbnailUrl(thumb.videoId, 'mq')}
                      alt={thumb.title}
                      className="w-full aspect-video object-cover"
                    />
                    <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-sm font-black border ${getScoreBg(thumb.score)}`}>
                      <span className={getScoreColor(thumb.score)}>{thumb.score}</span>
                    </div>
                    {thumb.viewCount > 0 && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {formatNumber(thumb.viewCount)}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-200 line-clamp-2 mb-3">{thumb.title}</p>
                    <div className="space-y-2">
                      <ScoreRow icon={<Palette className="w-3 h-3 text-red-400" />} label="Couleurs" score={thumb.colorContrast} color={getProgressColor(thumb.colorContrast)} />
                      <ScoreRow icon={<AlignLeft className="w-3 h-3 text-blue-400" />} label="Texte" score={thumb.textReadability} color={getProgressColor(thumb.textReadability)} />
                      <ScoreRow icon={<Star className="w-3 h-3 text-yellow-400" />} label="Compo." score={thumb.composition} color={getProgressColor(thumb.composition)} />
                      <div className="flex items-center gap-2">
                        <Smile className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-gray-500 w-12">Visage</span>
                        <span className={`text-xs font-bold ml-auto ${thumb.facePresence ? 'text-green-400' : 'text-gray-600'}`}>
                          {thumb.facePresence ? '✓ Présent' : '✗ Absent'}
                        </span>
                      </div>
                    </div>
                    {thumb.feedback && (
                      <p className="mt-3 text-xs text-gray-500 italic border-t border-white/5 pt-2">"{thumb.feedback}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Thumbnail Generator */}
          <div className="bg-[#111111] rounded-2xl border border-red-500/20 overflow-hidden">
            <button
              className="w-full p-5 flex items-center justify-between text-left hover:bg-white/3 transition-colors"
              onClick={() => setShowGenerator(v => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Générer une miniature améliorée</p>
                  <p className="text-xs text-gray-500">Créez un mockup avec l'IA pour pitcher votre client</p>
                </div>
              </div>
              {showGenerator ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {showGenerator && (
              <div className="px-5 pb-5 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Titre de la vidéo *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        placeholder="Ex: Comment gagner 10 000€/mois..."
                        value={genForm.videoTitle}
                        onChange={e => setGenForm(f => ({ ...f, videoTitle: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Style visuel</label>
                      <div className="flex flex-wrap gap-2">
                        {STYLES.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setGenForm(f => ({ ...f, style: s.value }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${genForm.style === s.value ? 'bg-red-600/20 border-red-500/40 text-red-400' : 'bg-[#1a1a1a] border-white/8 text-gray-400 hover:text-white'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Palette de couleurs</label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map(c => (
                          <button
                            key={c.value}
                            onClick={() => setGenForm(f => ({ ...f, colors: c.value }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${genForm.colors === c.value ? 'bg-red-600/20 border-red-500/40 text-red-400' : 'bg-[#1a1a1a] border-white/8 text-gray-400 hover:text-white'}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Modèle IA</label>
                      <select
                        className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        value={genForm.model}
                        onChange={e => setGenForm(f => ({ ...f, model: e.target.value }))}
                      >
                        {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>

                    <Button onClick={handleGenerate} loading={generating} className="w-full" disabled={!genForm.videoTitle.trim()}>
                      <Wand2 className="w-4 h-4" /> Générer la miniature
                    </Button>
                  </div>

                  {/* Preview */}
                  <div className="flex flex-col">
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Aperçu</label>
                    {generating ? (
                      <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-white/5 flex flex-col items-center justify-center aspect-video gap-3">
                        <Wand2 className="w-8 h-8 text-red-400 animate-pulse" />
                        <p className="text-xs text-gray-500">Génération en cours...</p>
                        <p className="text-xs text-gray-600">~10-30 secondes</p>
                      </div>
                    ) : generatedImage ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <img
                          src={generatedImage}
                          alt="Miniature générée"
                          className="w-full aspect-video object-cover rounded-xl border border-white/8"
                        />
                        <Button variant="outline" size="sm" onClick={handleDownload} className="w-full">
                          <Download className="w-3.5 h-3.5" /> Télécharger
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center aspect-video gap-2">
                        <ImageIcon className="w-8 h-8 text-gray-700" />
                        <p className="text-xs text-gray-600">La miniature générée apparaîtra ici</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="font-bold text-white mb-2">Analyser les miniatures d'une chaîne</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Entrez l'ID ou l'URL d'une chaîne YouTube. Claude Sonnet va analyser ses miniatures et vous donner un score de qualité détaillé.
          </p>
          {!canAnalyze && (
            <p className="text-xs text-red-400 mt-3 font-medium">Disponible sur le plan Business uniquement</p>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreRow({ icon, label, score, color }: { icon: React.ReactNode; label: string; score: number; color: 'green' | 'yellow' | 'red' }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-gray-500 w-12">{label}</span>
      <div className="flex-1">
        <ProgressBar value={score} max={100} color={color} />
      </div>
      <span className="text-xs font-medium text-gray-400 w-6 text-right">{score}</span>
    </div>
  )
}
