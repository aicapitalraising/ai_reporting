-- Add UTM fields and custom data to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_value numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- Add commitment_amount to funded_investors table to properly track dollar amounts
-- (funded_amount already exists, but let's add commitment tracking)
ALTER TABLE public.funded_investors ADD COLUMN IF NOT EXISTS commitment_amount numeric DEFAULT 0;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON public.leads(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_value ON public.leads(pipeline_value) WHERE pipeline_value > 0;