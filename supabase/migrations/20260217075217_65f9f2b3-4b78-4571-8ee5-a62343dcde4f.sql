
-- Add creative media columns to meta_ads
ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS video_thumbnail_url text;
ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image';
