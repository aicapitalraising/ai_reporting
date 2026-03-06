
-- Lead enrichment data table
CREATE TABLE public.lead_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  enriched_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'retargetiq',
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_name text,
  last_name text,
  address text,
  city text,
  state text,
  zip text,
  gender text,
  birth_date text,
  household_income text,
  credit_range text,
  company_name text,
  company_title text,
  linkedin_url text,
  enriched_phones jsonb DEFAULT '[]'::jsonb,
  enriched_emails jsonb DEFAULT '[]'::jsonb,
  vehicles jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(external_id, client_id)
);

ALTER TABLE public.lead_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lead_enrichment" ON public.lead_enrichment FOR SELECT USING (true);
CREATE POLICY "Public can insert lead_enrichment" ON public.lead_enrichment FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update lead_enrichment" ON public.lead_enrichment FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete lead_enrichment" ON public.lead_enrichment FOR DELETE USING (true);

-- Add retargetiq_website_slug to client_settings
ALTER TABLE public.client_settings ADD COLUMN IF NOT EXISTS retargetiq_website_slug text;
ALTER TABLE public.client_settings ADD COLUMN IF NOT EXISTS retargetiq_auto_enrich boolean DEFAULT false;
