
ALTER TABLE public.client_settings
  ADD COLUMN IF NOT EXISTS fathom_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fathom_api_key text,
  ADD COLUMN IF NOT EXISTS fathom_last_sync timestamp with time zone;
