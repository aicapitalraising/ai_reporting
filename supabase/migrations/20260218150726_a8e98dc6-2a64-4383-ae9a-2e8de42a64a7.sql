
ALTER TABLE public.client_settings 
ADD COLUMN meta_ads_sync_streak integer NOT NULL DEFAULT 0,
ADD COLUMN meta_ads_last_sync_date date;
