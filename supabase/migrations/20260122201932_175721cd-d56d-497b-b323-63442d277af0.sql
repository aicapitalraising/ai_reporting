-- Add new fields to client_settings for KPI tracking
ALTER TABLE public.client_settings 
ADD COLUMN IF NOT EXISTS monthly_ad_spend_target numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_raise_amount numeric DEFAULT 0;

-- Add API key storage to agency_settings
ALTER TABLE public.agency_settings 
ADD COLUMN IF NOT EXISTS openai_api_key text,
ADD COLUMN IF NOT EXISTS gemini_api_key text,
ADD COLUMN IF NOT EXISTS api_usage_limit numeric DEFAULT 100;