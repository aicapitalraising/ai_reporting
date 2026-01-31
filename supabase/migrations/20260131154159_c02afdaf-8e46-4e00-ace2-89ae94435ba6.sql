-- 1. Drop the old unique constraint that includes 'source' (allows duplicates)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_client_id_external_id_source_key;

-- 2. Handle existing duplicates by keeping only the oldest record (first created_at)
-- Use a CTE with row_number to identify duplicates
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, external_id ORDER BY created_at ASC) as rn
  FROM public.leads
)
DELETE FROM public.leads 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 3. Now add the unique constraint
ALTER TABLE public.leads ADD CONSTRAINT leads_client_id_external_id_unique UNIQUE (client_id, external_id);

-- 4. Create index to improve upsert performance
CREATE INDEX IF NOT EXISTS idx_leads_external_id ON public.leads(external_id);

-- 5. Enable pg_cron and pg_net extensions for scheduled sync
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;