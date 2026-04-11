-- ============================================
-- MiniaMaker - Schema SQL Supabase
-- ============================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Fonction updated_at ────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── PROFILES ───────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  total_searches_used integer not null default 0,
  portfolio_slug text unique,
  portfolio_public boolean not null default false,
  google_sheets_token jsonb,
  notion_access_token text,
  notion_workspace_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Création automatique du profil à l'inscription
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── CHANNELS ───────────────────────────────
create table channels (
  id uuid primary key default uuid_generate_v4(),
  youtube_channel_id text not null unique,
  channel_name text not null,
  channel_handle text,
  description text,
  thumbnail_url text,
  banner_url text,
  country text,
  default_language text,
  subscriber_count bigint not null default 0,
  video_count integer not null default 0,
  view_count bigint not null default 0,
  custom_url text,
  published_at timestamptz,
  avg_views_last_10 bigint,
  upload_frequency_days numeric,
  niche_category text,
  thumbnail_quality_score numeric,
  prospect_score integer,
  last_video_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index channels_youtube_id_idx on channels(youtube_channel_id);
create index channels_subscriber_count_idx on channels(subscriber_count);
create index channels_prospect_score_idx on channels(prospect_score);

alter table channels enable row level security;

create policy "Channels are publicly readable"
  on channels for select using (true);

create policy "Service role can manage channels"
  on channels for all using (auth.role() = 'service_role');

-- ─── CHANNEL VIDEOS ─────────────────────────
create table channel_videos (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references channels(id) on delete cascade,
  youtube_video_id text not null unique,
  title text not null,
  thumbnail_url text,
  thumbnail_maxres_url text,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  comment_count bigint not null default 0,
  published_at timestamptz,
  duration_seconds integer,
  thumbnail_analysis jsonb,
  thumbnail_score integer,
  created_at timestamptz not null default now()
);

create index channel_videos_channel_id_idx on channel_videos(channel_id);

alter table channel_videos enable row level security;

create policy "Channel videos are publicly readable"
  on channel_videos for select using (true);

create policy "Service role can manage channel videos"
  on channel_videos for all using (auth.role() = 'service_role');

-- ─── SEARCHES ───────────────────────────────
create table searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  query_text text not null,
  filters jsonb not null default '{}',
  total_results integer not null default 0,
  created_at timestamptz not null default now()
);

create index searches_user_id_idx on searches(user_id);

alter table searches enable row level security;

create policy "Users can manage own searches"
  on searches for all using (auth.uid() = user_id);

-- ─── SEARCH RESULTS ─────────────────────────
create table search_results (
  id uuid primary key default uuid_generate_v4(),
  search_id uuid not null references searches(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index search_results_search_id_idx on search_results(search_id);
create index search_results_user_id_idx on search_results(user_id);

alter table search_results enable row level security;

create policy "Users can manage own search results"
  on search_results for all using (auth.uid() = user_id);

-- ─── PROSPECTS ──────────────────────────────
create table prospects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  status text not null default 'decouvert' check (status in ('decouvert', 'contacte', 'negociation', 'client', 'perdu')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  notes text,
  contact_email text,
  contact_name text,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  estimated_value numeric,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, channel_id)
);

create index prospects_user_id_idx on prospects(user_id);
create index prospects_status_idx on prospects(status);

create trigger prospects_updated_at
  before update on prospects
  for each row execute function update_updated_at();

alter table prospects enable row level security;

create policy "Users can manage own prospects"
  on prospects for all using (auth.uid() = user_id);

-- ─── PROSPECT ACTIVITIES ────────────────────
create table prospect_activities (
  id uuid primary key default uuid_generate_v4(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('status_change', 'note', 'email_sent', 'call', 'meeting', 'other')),
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index prospect_activities_prospect_id_idx on prospect_activities(prospect_id);

alter table prospect_activities enable row level security;

create policy "Users can manage own prospect activities"
  on prospect_activities for all using (auth.uid() = user_id);

-- ─── CLIENTS ────────────────────────────────
create table clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  prospect_id uuid references prospects(id) on delete set null,
  channel_id uuid references channels(id) on delete set null,
  client_name text not null,
  client_email text,
  channel_name text,
  youtube_channel_id text,
  monthly_rate numeric,
  per_thumbnail_rate numeric,
  contract_type text not null default 'per_thumbnail' check (contract_type in ('monthly', 'per_thumbnail', 'package', 'other')),
  contract_start date,
  contract_end date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_user_id_idx on clients(user_id);

create trigger clients_updated_at
  before update on clients
  for each row execute function update_updated_at();

alter table clients enable row level security;

create policy "Users can manage own clients"
  on clients for all using (auth.uid() = user_id);

-- ─── DELIVERABLES ───────────────────────────
create table deliverables (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'en_revision', 'valide', 'livre')),
  due_date date,
  delivered_at timestamptz,
  price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deliverables_client_id_idx on deliverables(client_id);
create index deliverables_user_id_idx on deliverables(user_id);

create trigger deliverables_updated_at
  before update on deliverables
  for each row execute function update_updated_at();

alter table deliverables enable row level security;

create policy "Users can manage own deliverables"
  on deliverables for all using (auth.uid() = user_id);

-- ─── REVENUE ENTRIES ────────────────────────
create table revenue_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  deliverable_id uuid references deliverables(id) on delete set null,
  amount numeric not null,
  currency text not null default 'EUR',
  type text not null default 'payment' check (type in ('payment', 'invoice', 'refund')),
  status text not null default 'paid' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  description text,
  invoice_number text,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index revenue_entries_user_id_idx on revenue_entries(user_id);

alter table revenue_entries enable row level security;

create policy "Users can manage own revenue entries"
  on revenue_entries for all using (auth.uid() = user_id);

-- ─── REVENUE GOALS ──────────────────────────
create table revenue_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  target_amount numeric not null,
  created_at timestamptz not null default now(),
  unique(user_id, month, year)
);

alter table revenue_goals enable row level security;

create policy "Users can manage own revenue goals"
  on revenue_goals for all using (auth.uid() = user_id);

-- ─── PORTFOLIO ITEMS ────────────────────────
create table portfolio_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,
  before_image_url text,
  client_name text,
  youtube_video_url text,
  category text,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index portfolio_items_user_id_idx on portfolio_items(user_id);

alter table portfolio_items enable row level security;

create policy "Users can manage own portfolio"
  on portfolio_items for all using (auth.uid() = user_id);

create policy "Public portfolio items are readable"
  on portfolio_items for select
  using (
    is_visible = true
    and exists (
      select 1 from profiles
      where profiles.id = portfolio_items.user_id
      and profiles.portfolio_public = true
    )
  );

-- ─── OUTREACH TEMPLATES ─────────────────────
create table outreach_templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  subject text,
  body text not null,
  type text not null default 'email' check (type in ('email', 'dm', 'twitter', 'discord')),
  variables text[] not null default '{}',
  is_ai_generated boolean not null default false,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outreach_templates_user_id_idx on outreach_templates(user_id);

create trigger outreach_templates_updated_at
  before update on outreach_templates
  for each row execute function update_updated_at();

alter table outreach_templates enable row level security;

create policy "Users can manage own outreach templates"
  on outreach_templates for all using (auth.uid() = user_id);

-- ─── SAVED SEARCHES (VEILLE) ────────────────
create table saved_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  alert_enabled boolean not null default false,
  last_alert_at timestamptz,
  new_matches_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index saved_searches_user_id_idx on saved_searches(user_id);

alter table saved_searches enable row level security;

create policy "Users can manage own saved searches"
  on saved_searches for all using (auth.uid() = user_id);

-- ─── THUMBNAIL ANALYSES (cache) ─────────────
create table thumbnail_analyses (
  id uuid primary key default uuid_generate_v4(),
  youtube_channel_id text not null unique,
  user_id uuid not null references profiles(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table thumbnail_analyses enable row level security;

create policy "Users can manage own thumbnail analyses"
  on thumbnail_analyses for all using (auth.uid() = user_id);

-- ─── NOTIFICATIONS ──────────────────────────
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('trend_alert', 'new_match', 'followup_reminder', 'deliverable_due', 'payment_due', 'system')),
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on notifications(user_id);
create index notifications_is_read_idx on notifications(is_read);

alter table notifications enable row level security;

create policy "Users can manage own notifications"
  on notifications for all using (auth.uid() = user_id);

-- ─── Storage bucket (portfolio images) ──────
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict do nothing;

create policy "Portfolio images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'portfolio');

create policy "Users can upload portfolio images"
  on storage.objects for insert
  with check (bucket_id = 'portfolio' and auth.role() = 'authenticated');

create policy "Users can delete own portfolio images"
  on storage.objects for delete
  using (bucket_id = 'portfolio' and auth.uid()::text = (storage.foldername(name))[1]);
