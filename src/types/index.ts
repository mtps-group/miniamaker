// ============================================
// MiniaMaker - Types TypeScript
// ============================================

// ── Auth & User ──────────────────────────────
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  stripe_customer_id: string | null
  plan: PlanSlug
  total_searches_used: number
  portfolio_slug: string | null
  portfolio_public: boolean
  google_sheets_token: Record<string, unknown> | null
  notion_access_token: string | null
  notion_workspace_name: string | null
  created_at: string
  updated_at: string
}

export type PlanSlug = 'free' | 'pro' | 'business'

export interface PlanConfig {
  name: string
  slug: PlanSlug
  maxSearchesLifetime: number
  maxResultsPerSearch: number
  visibleResults: number
  maxProspects: number
  canExport: boolean
  hasCRM: boolean
  hasAnalysis: boolean
  hasOutreach: boolean
  hasClients: boolean
  hasPortfolio: boolean
  hasRevenue: boolean
  hasAlerts: boolean
  hasWatchlists: boolean
  priceMonthly: number
  stripePriceId?: string
}

// ── YouTube ──────────────────────────────────
export interface YouTubeChannel {
  youtube_channel_id: string
  channel_name: string
  channel_handle: string | null
  description: string | null
  thumbnail_url: string | null
  banner_url: string | null
  country: string | null
  default_language: string | null
  subscriber_count: number
  video_count: number
  view_count: number
  custom_url: string | null
  published_at: string | null
}

export interface Channel extends YouTubeChannel {
  id: string
  avg_views_last_10: number | null
  upload_frequency_days: number | null
  niche_category: string | null
  thumbnail_quality_score: number | null
  prospect_score: number | null
  last_video_at: string | null
  last_synced_at: string
  created_at: string
}

export interface ChannelVideo {
  id: string
  channel_id: string
  youtube_video_id: string
  title: string
  thumbnail_url: string | null
  thumbnail_maxres_url: string | null
  view_count: number
  like_count: number
  comment_count: number
  published_at: string | null
  duration_seconds: number | null
  thumbnail_analysis: ThumbnailAnalysisData | null
  thumbnail_score: number | null
  created_at: string
}

// ── Search ───────────────────────────────────
export interface SearchFilters {
  minSubscribers?: number
  maxSubscribers?: number
  minAvgViews?: number
  maxAvgViews?: number
  niche?: string
  country?: string
  minUploadFrequency?: number
  maxUploadFrequency?: number
  maxThumbnailScore?: number
}

export interface Search {
  id: string
  user_id: string
  query_text: string
  filters: SearchFilters
  total_results: number
  created_at: string
}

export interface SearchResult {
  id: string
  search_id: string
  user_id: string
  channel_id: string
  position: number
  created_at: string
  channel?: Channel
}

// ── Prospects ────────────────────────────────
export type ProspectStatus = 'decouvert' | 'contacte' | 'negociation' | 'client' | 'perdu'
export type ProspectPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Prospect {
  id: string
  user_id: string
  channel_id: string
  status: ProspectStatus
  priority: ProspectPriority
  notes: string | null
  contact_email: string | null
  contact_name: string | null
  last_contacted_at: string | null
  next_followup_at: string | null
  estimated_value: number | null
  tags: string[]
  created_at: string
  updated_at: string
  channel?: Channel
}

export type ProspectActivityType = 'status_change' | 'note' | 'email_sent' | 'call' | 'meeting' | 'other'

export interface ProspectActivity {
  id: string
  prospect_id: string
  user_id: string
  type: ProspectActivityType
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

// ── Clients ──────────────────────────────────
export type ContractType = 'monthly' | 'per_thumbnail' | 'package' | 'other'

export interface Client {
  id: string
  user_id: string
  prospect_id: string | null
  channel_id: string | null
  client_name: string
  client_email: string | null
  channel_name: string | null
  youtube_channel_id: string | null
  monthly_rate: number | null
  per_thumbnail_rate: number | null
  contract_type: ContractType
  contract_start: string | null
  contract_end: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type DeliverableStatus = 'a_faire' | 'en_cours' | 'en_revision' | 'valide' | 'livre'

export interface Deliverable {
  id: string
  client_id: string
  user_id: string
  title: string
  description: string | null
  status: DeliverableStatus
  due_date: string | null
  delivered_at: string | null
  price: number | null
  created_at: string
  updated_at: string
}

// ── Revenue ──────────────────────────────────
export type RevenueType = 'payment' | 'invoice' | 'refund'
export type RevenueStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface RevenueEntry {
  id: string
  user_id: string
  client_id: string | null
  deliverable_id: string | null
  amount: number
  currency: string
  type: RevenueType
  status: RevenueStatus
  description: string | null
  invoice_number: string | null
  due_date: string | null
  paid_at: string | null
  created_at: string
  client?: Client
}

export interface RevenueGoal {
  id: string
  user_id: string
  month: number
  year: number
  target_amount: number
  created_at: string
}

// ── Portfolio ────────────────────────────────
export interface PortfolioItem {
  id: string
  user_id: string
  title: string
  description: string | null
  image_url: string
  before_image_url: string | null
  client_name: string | null
  youtube_video_url: string | null
  category: string | null
  position: number
  is_visible: boolean
  created_at: string
}

// ── Outreach ─────────────────────────────────
export type OutreachType = 'email' | 'dm' | 'twitter' | 'discord'

export interface OutreachTemplate {
  id: string
  user_id: string
  name: string
  subject: string | null
  body: string
  type: OutreachType
  variables: string[]
  is_ai_generated: boolean
  use_count: number
  created_at: string
  updated_at: string
}

// ── Saved Searches & Watchlists ──────────────
export interface SavedSearch {
  id: string
  user_id: string
  name: string
  filters: SearchFilters
  alert_enabled: boolean
  last_alert_at: string | null
  new_matches_count: number
  created_at: string
}

// ── Thumbnail Analysis ───────────────────────
export interface ThumbnailAnalysisData {
  overall_score: number
  composition_score: number
  text_readability_score: number
  color_contrast_score: number
  face_presence: boolean
  emotion_detected: string | null
  text_detected: string | null
  style_consistency_score: number
  ctr_potential: 'low' | 'medium' | 'high' | 'very_high'
  detailed_feedback: string | null
}

export interface ThumbnailAnalysis extends ThumbnailAnalysisData {
  id: string
  user_id: string
  channel_id: string | null
  video_id: string | null
  thumbnail_url: string
  analysis_data: Record<string, unknown>
  created_at: string
}

// ── Notifications ────────────────────────────
export type NotificationType = 'trend_alert' | 'new_match' | 'followup_reminder' | 'deliverable_due' | 'payment_due' | 'system'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

// ── Exports ──────────────────────────────────
export type ExportDestination = 'google_sheets' | 'notion' | 'csv'

export interface Export {
  id: string
  user_id: string
  search_id: string | null
  destination: ExportDestination
  destination_url: string | null
  result_count: number
  status: 'pending' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
}

// ── Scoring ──────────────────────────────────
export interface ScoreDetail {
  category: string
  score: number
  maxScore: number
  label: string
  description: string
}

export interface ProspectScore {
  total: number
  label: string
  labelColor: string
  details: ScoreDetail[]
}

// ── Niche Categories ─────────────────────────
export const NICHE_CATEGORIES = [
  'gaming', 'tech', 'business', 'finance', 'crypto',
  'lifestyle', 'fitness', 'cooking', 'travel', 'education',
  'entertainment', 'music', 'comedy', 'vlog', 'beauty',
  'fashion', 'sports', 'science', 'news', 'real_estate',
  'marketing', 'coaching', 'kids', 'diy', 'automotive',
  'photography', 'art', 'health', 'motivation', 'other'
] as const

export type NicheCategory = typeof NICHE_CATEGORIES[number]

// ── Countries ────────────────────────────────
export const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'US', name: 'États-Unis' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'BR', name: 'Brésil' },
  { code: 'IN', name: 'Inde' },
  { code: 'JP', name: 'Japon' },
  { code: 'KR', name: 'Corée du Sud' },
  { code: 'AU', name: 'Australie' },
  { code: 'MX', name: 'Mexique' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'SE', name: 'Suède' },
  { code: 'PL', name: 'Pologne' },
  { code: 'MA', name: 'Maroc' },
  { code: 'DZ', name: 'Algérie' },
  { code: 'TN', name: 'Tunisie' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
] as const
