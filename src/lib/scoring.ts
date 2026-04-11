import type { Channel, ProspectScore, ScoreDetail } from '@/types'

const HIGH_VALUE_NICHES = ['business', 'finance', 'crypto', 'real_estate', 'marketing', 'coaching', 'tech']
const MEDIUM_VALUE_NICHES = ['gaming', 'lifestyle', 'fitness', 'cooking', 'travel', 'education', 'photography', 'art']
const LOW_VALUE_NICHES = ['vlog', 'music', 'comedy', 'kids']

export function computeProspectScore(channel: Channel): ProspectScore {
  const details: ScoreDetail[] = []
  let total = 0

  // 1. Subscriber Count (15 pts) - Sweet spot 10K-500K
  const subs = channel.subscriber_count || 0
  let subScore = 3
  if (subs >= 10_000 && subs < 50_000) subScore = 15
  else if (subs >= 50_000 && subs < 200_000) subScore = 13
  else if (subs >= 200_000 && subs < 500_000) subScore = 10
  else if (subs >= 1_000 && subs < 10_000) subScore = 8
  else if (subs >= 500_000) subScore = 6

  details.push({
    category: 'Abonnés',
    score: subScore,
    maxScore: 15,
    label: `${formatNum(subs)} abonnés`,
    description: subs >= 10_000 && subs < 50_000 ? 'Zone idéale - en croissance, investit dans la qualité' :
      subs >= 50_000 && subs < 200_000 ? 'Établi, budget disponible' :
      subs >= 200_000 ? 'Peut déjà avoir un designer' :
      subs >= 1_000 ? 'Budget potentiellement limité' : 'Trop petit'
  })
  total += subScore

  // 2. Thumbnail Quality (25 pts) - INVERSE: worse = better prospect
  const thumbQuality = channel.thumbnail_quality_score ?? 50
  let thumbScore = 10
  if (thumbQuality <= 20) thumbScore = 25
  else if (thumbQuality <= 40) thumbScore = 22
  else if (thumbQuality <= 55) thumbScore = 18
  else if (thumbQuality <= 70) thumbScore = 10
  else thumbScore = 3

  details.push({
    category: 'Qualité miniatures',
    score: thumbScore,
    maxScore: 25,
    label: `Score qualité: ${thumbQuality}/100`,
    description: thumbQuality <= 40 ? 'Miniatures de mauvaise qualité - besoin urgent' :
      thumbQuality <= 55 ? 'Qualité médiocre - marge d\'amélioration' :
      'Miniatures correctes - vente plus difficile'
  })
  total += thumbScore

  // 3. Upload Frequency (15 pts)
  const freqDays = channel.upload_frequency_days ?? 14
  let freqScore = 5
  if (freqDays <= 2.5) freqScore = 15       // 3+ videos/week
  else if (freqDays <= 7) freqScore = 13    // 1-3 videos/week
  else if (freqDays <= 15) freqScore = 10   // 2-4 videos/month
  else if (freqDays <= 30) freqScore = 5    // 1 video/month
  else freqScore = 2

  details.push({
    category: 'Fréquence d\'upload',
    score: freqScore,
    maxScore: 15,
    label: freqDays <= 7 ? `${Math.round(7 / freqDays)} vidéos/semaine` : `1 vidéo/${Math.round(freqDays)} jours`,
    description: freqDays <= 7 ? 'Upload fréquent - besoin constant de miniatures' :
      freqDays <= 15 ? 'Upload régulier' : 'Upload rare - moins de miniatures nécessaires'
  })
  total += freqScore

  // 4. Views/Subscribers Ratio (15 pts) - Low ratio = thumbnails failing
  const avgViews = channel.avg_views_last_10 ?? 0
  const ratio = subs > 0 ? (avgViews / subs) * 100 : 0
  let ratioScore = 8
  if (ratio < 5) ratioScore = 15
  else if (ratio < 15) ratioScore = 12
  else if (ratio < 30) ratioScore = 8
  else ratioScore = 4

  details.push({
    category: 'Ratio vues/abonnés',
    score: ratioScore,
    maxScore: 15,
    label: `${ratio.toFixed(1)}% de taux de clic`,
    description: ratio < 15 ? 'Ratio faible - les miniatures ne convertissent pas' :
      'Bon ratio - les miniatures fonctionnent déjà'
  })
  total += ratioScore

  // 5. Niche Value (15 pts)
  const niche = channel.niche_category || 'other'
  let nicheScore = 8
  if (HIGH_VALUE_NICHES.includes(niche)) nicheScore = 15
  else if (MEDIUM_VALUE_NICHES.includes(niche)) nicheScore = 10
  else if (LOW_VALUE_NICHES.includes(niche)) nicheScore = 5

  details.push({
    category: 'Valeur de la niche',
    score: nicheScore,
    maxScore: 15,
    label: niche.charAt(0).toUpperCase() + niche.slice(1),
    description: HIGH_VALUE_NICHES.includes(niche) ? 'Niche à forte valeur - budget élevé' :
      MEDIUM_VALUE_NICHES.includes(niche) ? 'Niche de valeur moyenne' :
      'Niche à faible valeur - budget limité'
  })
  total += nicheScore

  // 6. Consistency (15 pts) - placeholder, computed from thumbnail analysis variance
  const consistencyScore = 10 // Default medium
  details.push({
    category: 'Cohérence visuelle',
    score: consistencyScore,
    maxScore: 15,
    label: 'Cohérence moyenne',
    description: 'Analyse de cohérence entre les miniatures'
  })
  total += consistencyScore

  // Label
  let label = 'Faible potentiel'
  let labelColor = 'bg-gray-100 text-gray-600 border-gray-200'
  if (total >= 80) { label = 'Prospect idéal'; labelColor = 'bg-red-100 text-red-700 border-red-200' }
  else if (total >= 65) { label = 'Excellent prospect'; labelColor = 'bg-orange-100 text-orange-700 border-orange-200' }
  else if (total >= 45) { label = 'Prospect moyen'; labelColor = 'bg-blue-100 text-blue-700 border-blue-200' }

  return { total, label, labelColor, details }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}
