-- Create client_live_ads table for storing scraped Facebook Ads Library data
CREATE TABLE public.client_live_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.funnel_campaigns(id) ON DELETE SET NULL,
  
  -- Ad Library metadata
  ad_library_id TEXT,
  ad_library_url TEXT,
  page_id TEXT,
  page_name TEXT,
  
  -- Scraped content
  primary_text TEXT,
  headline TEXT,
  description TEXT,
  cta_type TEXT,
  media_type TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  
  -- Status & tracking
  status TEXT DEFAULT 'active',
  platforms JSONB DEFAULT '[]'::jsonb,
  started_running_on DATE,
  impressions_bucket TEXT,
  
  -- AI analysis
  ai_analysis JSONB,
  last_analyzed_at TIMESTAMPTZ,
  
  -- Scrape tracking
  scraped_at TIMESTAMPTZ DEFAULT now(),
  raw_markdown TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_live_ads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view client_live_ads" ON public.client_live_ads FOR SELECT USING (true);
CREATE POLICY "Public can insert client_live_ads" ON public.client_live_ads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update client_live_ads" ON public.client_live_ads FOR UPDATE USING (true);
CREATE POLICY "Public can delete client_live_ads" ON public.client_live_ads FOR DELETE USING (true);

-- Add timestamp trigger
CREATE TRIGGER update_client_live_ads_updated_at
BEFORE UPDATE ON public.client_live_ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add ads library fields to client_settings
ALTER TABLE public.client_settings 
  ADD COLUMN IF NOT EXISTS ads_library_page_id TEXT,
  ADD COLUMN IF NOT EXISTS ads_library_url TEXT;

-- Create storage bucket for live ads media
INSERT INTO storage.buckets (id, name, public) VALUES ('live-ads', 'live-ads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for live-ads bucket
CREATE POLICY "Public can view live-ads" ON storage.objects FOR SELECT USING (bucket_id = 'live-ads');
CREATE POLICY "Public can upload live-ads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'live-ads');
CREATE POLICY "Public can delete live-ads" ON storage.objects FOR DELETE USING (bucket_id = 'live-ads');