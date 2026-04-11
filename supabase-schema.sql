-- ============================================
-- MiniaMaker - Supabase Database Schema
-- Production-ready with RLS, indexes, triggers
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ════════════════════════════════════════════
-- 1. PROFILES
-- ════════════════════════════════════════════
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  total_searches_used INTEGER NOT NULL DEFAULT 0,
  portfolio_slug TEXT UNIQUE,
  portfolio_public BOOLEAN NOT NULL DEFAULT false,
  google_sheets_token JSONB,
  notion_access_token TEXT,
  notion_workspace_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Public portfolio access
CREATE POLICY "profiles_select_public_portfolio" ON profiles FOR SELECT
  USING (portfolio_public = true AND portfolio_slug IS NOT NULL);

CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_profiles_portfolio_slug ON profiles(portfolio_slug) WHERE portfolio_slug IS NOT NULL;
CREATE INDEX idx_profiles_plan ON profiles(plan);

-- ════════════════════════════════════════════
-- 2. SUBSCRIPTIONS
-- ════════════════════════════════════════════
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ════════════════════════════════════════════
-- 3. CHANNELS (shared, not user-specific)
-- ════════════════════════════════════════════
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_channel_id TEXT NOT NULL UNIQUE,
  channel_name TEXT NOT NULL,
  channel_handle TEXT,
  description TEXT,
  thumbnail_url TEXT,
  banner_url TEXT,
  country TEXT,
  default_language TEXT,
  subscriber_count BIGINT NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  custom_url TEXT,
  published_at TIMESTAMPTZ,
  avg_views_last_10 BIGINT,
  upload_frequency_days REAL,
  niche_category TEXT,
  thumbnail_quality_score REAL,
  prospect_score REAL,
  last_video_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Channels are shared data: any authenticated user can read
CREATE POLICY "channels_select_authenticated" ON channels FOR SELECT
  TO authenticated USING (true);
-- Only service role or edge functions insert/update channels
CREATE POLICY "channels_insert_authenticated" ON channels FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "channels_update_authenticated" ON channels FOR UPDATE
  TO authenticated USING (true);

CREATE INDEX idx_channels_youtube_id ON channels(youtube_channel_id);
CREATE INDEX idx_channels_subscriber_count ON channels(subscriber_count);
CREATE INDEX idx_channels_niche ON channels(niche_category) WHERE niche_category IS NOT NULL;
CREATE INDEX idx_channels_prospect_score ON channels(prospect_score DESC NULLS LAST);
CREATE INDEX idx_channels_country ON channels(country) WHERE country IS NOT NULL;
CREATE INDEX idx_channels_last_synced ON channels(last_synced_at);
CREATE INDEX idx_channels_thumb_quality ON channels(thumbnail_quality_score) WHERE thumbnail_quality_score IS NOT NULL;

-- ════════════════════════════════════════════
-- 4. CHANNEL_VIDEOS
-- ════════════════════════════════════════════
CREATE TABLE channel_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  thumbnail_maxres_url TEXT,
  view_count BIGINT NOT NULL DEFAULT 0,
  like_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  thumbnail_analysis JSONB,
  thumbnail_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE channel_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_videos_select_authenticated" ON channel_videos FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "channel_videos_insert_authenticated" ON channel_videos FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "channel_videos_update_authenticated" ON channel_videos FOR UPDATE
  TO authenticated USING (true);

CREATE INDEX idx_channel_videos_channel ON channel_videos(channel_id);
CREATE INDEX idx_channel_videos_youtube_id ON channel_videos(youtube_video_id);
CREATE INDEX idx_channel_videos_published ON channel_videos(channel_id, published_at DESC);

-- ════════════════════════════════════════════
-- 5. SEARCHES
-- ════════════════════════════════════════════
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  total_results INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "searches_select_own" ON searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "searches_insert_own" ON searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "searches_delete_own" ON searches FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_searches_user ON searches(user_id);
CREATE INDEX idx_searches_created ON searches(user_id, created_at DESC);

-- ════════════════════════════════════════════
-- 6. SEARCH_RESULTS
-- ════════════════════════════════════════════
CREATE TABLE search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_results_select_own" ON search_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "search_results_insert_own" ON search_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "search_results_delete_own" ON search_results FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_search_results_search ON search_results(search_id);
CREATE INDEX idx_search_results_user ON search_results(user_id);
CREATE INDEX idx_search_results_position ON search_results(search_id, position);

-- ════════════════════════════════════════════
-- 7. PROSPECTS
-- ════════════════════════════════════════════
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'decouvert' CHECK (status IN ('decouvert', 'contacte', 'negociation', 'client', 'perdu')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  contact_email TEXT,
  contact_name TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  estimated_value NUMERIC(10, 2),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospects_select_own" ON prospects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prospects_insert_own" ON prospects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prospects_update_own" ON prospects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "prospects_delete_own" ON prospects FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_prospects_user ON prospects(user_id);
CREATE INDEX idx_prospects_status ON prospects(user_id, status);
CREATE INDEX idx_prospects_priority ON prospects(user_id, priority);
CREATE INDEX idx_prospects_channel ON prospects(channel_id);
CREATE INDEX idx_prospects_followup ON prospects(next_followup_at) WHERE next_followup_at IS NOT NULL;

-- ════════════════════════════════════════════
-- 8. PROSPECT_ACTIVITIES
-- ════════════════════════════════════════════
CREATE TABLE prospect_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('status_change', 'note', 'email_sent', 'call', 'meeting', 'other')),
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE prospect_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_activities_select_own" ON prospect_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prospect_activities_insert_own" ON prospect_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prospect_activities_delete_own" ON prospect_activities FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_prospect_activities_prospect ON prospect_activities(prospect_id);
CREATE INDEX idx_prospect_activities_user ON prospect_activities(user_id);
CREATE INDEX idx_prospect_activities_created ON prospect_activities(prospect_id, created_at DESC);

-- ════════════════════════════════════════════
-- 9. CLIENTS
-- ════════════════════════════════════════════
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  channel_name TEXT,
  youtube_channel_id TEXT,
  monthly_rate NUMERIC(10, 2),
  per_thumbnail_rate NUMERIC(10, 2),
  contract_type TEXT NOT NULL DEFAULT 'per_thumbnail' CHECK (contract_type IN ('monthly', 'per_thumbnail', 'package', 'other')),
  contract_start DATE,
  contract_end DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_own" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert_own" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update_own" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete_own" ON clients FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_active ON clients(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_clients_prospect ON clients(prospect_id) WHERE prospect_id IS NOT NULL;

-- ════════════════════════════════════════════
-- 10. DELIVERABLES
-- ════════════════════════════════════════════
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'a_faire' CHECK (status IN ('a_faire', 'en_cours', 'en_revision', 'valide', 'livre')),
  due_date DATE,
  delivered_at TIMESTAMPTZ,
  price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliverables_select_own" ON deliverables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "deliverables_insert_own" ON deliverables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deliverables_update_own" ON deliverables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "deliverables_delete_own" ON deliverables FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_deliverables_client ON deliverables(client_id);
CREATE INDEX idx_deliverables_user ON deliverables(user_id);
CREATE INDEX idx_deliverables_status ON deliverables(user_id, status);
CREATE INDEX idx_deliverables_due ON deliverables(due_date) WHERE due_date IS NOT NULL AND status != 'livre';

-- ════════════════════════════════════════════
-- 11. REVENUE_ENTRIES
-- ════════════════════════════════════════════
CREATE TABLE revenue_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  type TEXT NOT NULL DEFAULT 'payment' CHECK (type IN ('payment', 'invoice', 'refund')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  description TEXT,
  invoice_number TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_entries_select_own" ON revenue_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "revenue_entries_insert_own" ON revenue_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "revenue_entries_update_own" ON revenue_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "revenue_entries_delete_own" ON revenue_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_revenue_entries_user ON revenue_entries(user_id);
CREATE INDEX idx_revenue_entries_client ON revenue_entries(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_revenue_entries_status ON revenue_entries(user_id, status);
CREATE INDEX idx_revenue_entries_created ON revenue_entries(user_id, created_at DESC);
CREATE INDEX idx_revenue_entries_paid ON revenue_entries(paid_at) WHERE paid_at IS NOT NULL;

-- ════════════════════════════════════════════
-- 12. REVENUE_GOALS
-- ════════════════════════════════════════════
CREATE TABLE revenue_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024 AND year <= 2100),
  target_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE revenue_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_goals_select_own" ON revenue_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "revenue_goals_insert_own" ON revenue_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "revenue_goals_update_own" ON revenue_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "revenue_goals_delete_own" ON revenue_goals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_revenue_goals_user ON revenue_goals(user_id);
CREATE INDEX idx_revenue_goals_period ON revenue_goals(user_id, year, month);

-- ════════════════════════════════════════════
-- 13. PORTFOLIO_ITEMS
-- ════════════════════════════════════════════
CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  before_image_url TEXT,
  client_name TEXT,
  youtube_video_url TEXT,
  category TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_items_select_own" ON portfolio_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "portfolio_items_insert_own" ON portfolio_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio_items_update_own" ON portfolio_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "portfolio_items_delete_own" ON portfolio_items FOR DELETE USING (auth.uid() = user_id);
-- Public portfolio: anyone can view visible items for public portfolios
CREATE POLICY "portfolio_items_select_public" ON portfolio_items FOR SELECT
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = portfolio_items.user_id
        AND profiles.portfolio_public = true
    )
  );

CREATE INDEX idx_portfolio_items_user ON portfolio_items(user_id);
CREATE INDEX idx_portfolio_items_position ON portfolio_items(user_id, position);

-- ════════════════════════════════════════════
-- 14. OUTREACH_TEMPLATES
-- ════════════════════════════════════════════
CREATE TABLE outreach_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'dm', 'twitter', 'discord')),
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_templates_select_own" ON outreach_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outreach_templates_insert_own" ON outreach_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outreach_templates_update_own" ON outreach_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "outreach_templates_delete_own" ON outreach_templates FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_outreach_templates_user ON outreach_templates(user_id);
CREATE INDEX idx_outreach_templates_type ON outreach_templates(user_id, type);

-- ════════════════════════════════════════════
-- 15. SAVED_SEARCHES
-- ════════════════════════════════════════════
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  alert_enabled BOOLEAN NOT NULL DEFAULT false,
  last_alert_at TIMESTAMPTZ,
  new_matches_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches_select_own" ON saved_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_searches_insert_own" ON saved_searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_searches_update_own" ON saved_searches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "saved_searches_delete_own" ON saved_searches FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alert ON saved_searches(alert_enabled) WHERE alert_enabled = true;

-- ════════════════════════════════════════════
-- 16. THUMBNAIL_ANALYSES
-- ════════════════════════════════════════════
CREATE TABLE thumbnail_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  video_id UUID REFERENCES channel_videos(id) ON DELETE SET NULL,
  thumbnail_url TEXT NOT NULL,
  overall_score REAL NOT NULL DEFAULT 0,
  composition_score REAL NOT NULL DEFAULT 0,
  text_readability_score REAL NOT NULL DEFAULT 0,
  color_contrast_score REAL NOT NULL DEFAULT 0,
  face_presence BOOLEAN NOT NULL DEFAULT false,
  emotion_detected TEXT,
  text_detected TEXT,
  style_consistency_score REAL NOT NULL DEFAULT 0,
  ctr_potential TEXT NOT NULL DEFAULT 'medium' CHECK (ctr_potential IN ('low', 'medium', 'high', 'very_high')),
  detailed_feedback TEXT,
  analysis_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE thumbnail_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thumbnail_analyses_select_own" ON thumbnail_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "thumbnail_analyses_insert_own" ON thumbnail_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "thumbnail_analyses_delete_own" ON thumbnail_analyses FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_thumbnail_analyses_user ON thumbnail_analyses(user_id);
CREATE INDEX idx_thumbnail_analyses_channel ON thumbnail_analyses(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX idx_thumbnail_analyses_created ON thumbnail_analyses(user_id, created_at DESC);

-- ════════════════════════════════════════════
-- 17. EXPORTS
-- ════════════════════════════════════════════
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
  destination TEXT NOT NULL CHECK (destination IN ('google_sheets', 'notion', 'csv')),
  destination_url TEXT,
  result_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exports_select_own" ON exports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "exports_insert_own" ON exports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exports_update_own" ON exports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "exports_delete_own" ON exports FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_exports_user ON exports(user_id);
CREATE INDEX idx_exports_created ON exports(user_id, created_at DESC);

-- ════════════════════════════════════════════
-- 18. NOTIFICATIONS
-- ════════════════════════════════════════════
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trend_alert', 'new_match', 'followup_reminder', 'deliverable_due', 'payment_due', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- ════════════════════════════════════════════
-- TRIGGERS
-- ════════════════════════════════════════════

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_prospects
  BEFORE UPDATE ON prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_deliverables
  BEFORE UPDATE ON deliverables FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_outreach_templates
  BEFORE UPDATE ON outreach_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment search count on profile
CREATE OR REPLACE FUNCTION increment_search_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET total_searches_used = total_searches_used + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_search_created
  AFTER INSERT ON searches
  FOR EACH ROW EXECUTE FUNCTION increment_search_count();
