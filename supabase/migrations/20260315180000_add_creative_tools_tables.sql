-- ============================================================
-- CREATIVE TOOLS MIGRATION
-- Adds all tables from ad-verse-ally into the unified reporting DB
-- ============================================================

-- Projects (creative projects per client)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assets (uploaded media assets)
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'document')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  size_bytes BIGINT,
  duration_seconds NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ad styles (style presets for static ads)
CREATE TABLE IF NOT EXISTS public.ad_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  style_config JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ad templates (reusable ad templates)
CREATE TABLE IF NOT EXISTS public.ad_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('static', 'video', 'carousel')),
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'linkedin', 'all')),
  template_data JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ad iterations (AI-generated iterations of ads)
CREATE TABLE IF NOT EXISTS public.ad_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES public.creatives(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  iteration_number INTEGER DEFAULT 1,
  prompt TEXT,
  image_url TEXT,
  video_url TEXT,
  copy_headline TEXT,
  copy_body TEXT,
  copy_cta TEXT,
  performance_score NUMERIC,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'launched')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scraped ads (ads scraped from Meta Ad Library / competitor research)
CREATE TABLE IF NOT EXISTS public.scraped_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('meta_library', 'instagram', 'manual', 'apify')),
  advertiser_name TEXT,
  ad_id TEXT,
  headline TEXT,
  body TEXT,
  image_url TEXT,
  video_url TEXT,
  platform TEXT,
  start_date DATE,
  end_date DATE,
  impressions_range TEXT,
  spend_range TEXT,
  tags TEXT[],
  is_swipe_file BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Swipe file (curated ads for inspiration)
CREATE TABLE IF NOT EXISTS public.swipe_file (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraped_ad_id UUID REFERENCES public.scraped_ads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  image_url TEXT,
  video_url TEXT,
  tags TEXT[],
  category TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Viral videos (tracked viral content)
CREATE TABLE IF NOT EXISTS public.viral_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook')),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  engagement_rate NUMERIC,
  creator_handle TEXT,
  creator_followers BIGINT,
  is_tracked BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Viral tracking targets (accounts to monitor)
CREATE TABLE IF NOT EXISTS public.viral_tracking_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  display_name TEXT,
  followers BIGINT,
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scraping schedule
CREATE TABLE IF NOT EXISTS public.scraping_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'manual')),
  platforms TEXT[] DEFAULT ARRAY['meta', 'instagram'],
  keywords TEXT[],
  competitor_handles TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Monitoring targets (competitor ads to monitor)
CREATE TABLE IF NOT EXISTS public.monitoring_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  advertiser_name TEXT NOT NULL,
  page_id TEXT,
  platform TEXT DEFAULT 'meta',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Monitoring status
CREATE TABLE IF NOT EXISTS public.monitoring_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID REFERENCES public.monitoring_targets(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_checked_at TIMESTAMPTZ,
  ads_found INTEGER DEFAULT 0,
  error_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Video projects (batch video generation projects)
CREATE TABLE IF NOT EXISTS public.video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  script_id UUID REFERENCES public.ad_scripts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'review', 'approved', 'exported')),
  aspect_ratio TEXT DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '1:1', '16:9', '4:5')),
  platform TEXT DEFAULT 'meta',
  scenes JSONB DEFAULT '[]',
  output_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Batch jobs (for batch processing)
CREATE TABLE IF NOT EXISTS public.batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('static_batch', 'video_batch', 'scraping', 'export')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  results JSONB DEFAULT '[]',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Avatars (AI avatar profiles)
CREATE TABLE IF NOT EXISTS public.avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'neutral')),
  age_range TEXT,
  style TEXT,
  base_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Avatar looks (different looks for each avatar)
CREATE TABLE IF NOT EXISTS public.avatar_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID REFERENCES public.avatars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Instagram creatives (scraped/generated instagram content)
CREATE TABLE IF NOT EXISTS public.instagram_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  source_url TEXT,
  image_url TEXT,
  video_url TEXT,
  caption TEXT,
  hashtags TEXT[],
  platform_post_id TEXT,
  engagement_rate NUMERIC,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Instagram scrape jobs
CREATE TABLE IF NOT EXISTS public.instagram_scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  target_handle TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  posts_found INTEGER DEFAULT 0,
  posts_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Copy library (reusable copy elements)
CREATE TABLE IF NOT EXISTS public.copy_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('headline', 'body', 'cta', 'hook', 'full_script')),
  content TEXT NOT NULL,
  platform TEXT,
  performance_score NUMERIC,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Custom ads (manually uploaded ads)
CREATE TABLE IF NOT EXISTS public.custom_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'carousel')),
  image_url TEXT,
  video_url TEXT,
  headline TEXT,
  body TEXT,
  cta TEXT,
  platform TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client ad assignments (linking ads to clients)
CREATE TABLE IF NOT EXISTS public.client_ad_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  creative_id UUID REFERENCES public.creatives(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by TEXT,
  notes TEXT,
  UNIQUE(client_id, creative_id)
);

-- Voices (AI voice profiles for video)
CREATE TABLE IF NOT EXISTS public.voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('elevenlabs', 'openai', 'google')),
  voice_id TEXT NOT NULL,
  gender TEXT,
  accent TEXT,
  style TEXT,
  preview_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Flowboards (visual workflow boards)
CREATE TABLE IF NOT EXISTS public.flowboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  viewport JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Apify settings (web scraping configuration)
CREATE TABLE IF NOT EXISTS public.apify_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  api_token TEXT,
  actor_id TEXT,
  schedule TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  api_name TEXT NOT NULL,
  endpoint TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'rate_limited')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS POLICIES (enable row level security)
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viral_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viral_tracking_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_ad_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apify_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Allow all access (internal tool - no auth required)
CREATE POLICY "Allow all" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.ad_styles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.ad_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.ad_iterations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.scraped_ads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.swipe_file FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.viral_videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.viral_tracking_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.scraping_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.monitoring_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.monitoring_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.video_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.batch_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.avatars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.avatar_looks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.instagram_creatives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.instagram_scrape_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.copy_library FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.custom_ads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.client_ad_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.voices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.flowboards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.apify_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.api_usage FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_assets_client_id ON public.assets(client_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON public.assets(project_id);
CREATE INDEX IF NOT EXISTS idx_ad_iterations_creative_id ON public.ad_iterations(creative_id);
CREATE INDEX IF NOT EXISTS idx_scraped_ads_client_id ON public.scraped_ads(client_id);
CREATE INDEX IF NOT EXISTS idx_swipe_file_client_id ON public.swipe_file(client_id);
CREATE INDEX IF NOT EXISTS idx_viral_videos_client_id ON public.viral_videos(client_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_client_id ON public.video_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_client_id ON public.batch_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_avatars_client_id ON public.avatars(client_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_client_id ON public.api_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at DESC);
