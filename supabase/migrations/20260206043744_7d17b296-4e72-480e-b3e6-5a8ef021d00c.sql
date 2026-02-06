-- Add HubSpot columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS hubspot_portal_id text,
ADD COLUMN IF NOT EXISTS hubspot_access_token text,
ADD COLUMN IF NOT EXISTS hubspot_sync_status text DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS hubspot_sync_error text,
ADD COLUMN IF NOT EXISTS last_hubspot_sync_at timestamp with time zone;

-- Add HubSpot settings to client_settings table
ALTER TABLE public.client_settings
ADD COLUMN IF NOT EXISTS hubspot_sync_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hubspot_funded_pipeline_id text,
ADD COLUMN IF NOT EXISTS hubspot_funded_stage_ids text[],
ADD COLUMN IF NOT EXISTS hubspot_committed_stage_ids text[],
ADD COLUMN IF NOT EXISTS hubspot_booked_meeting_types text[],
ADD COLUMN IF NOT EXISTS hubspot_reconnect_meeting_types text[],
ADD COLUMN IF NOT EXISTS hubspot_last_contacts_sync timestamp with time zone,
ADD COLUMN IF NOT EXISTS hubspot_last_deals_sync timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.hubspot_portal_id IS 'HubSpot account/portal ID';
COMMENT ON COLUMN public.clients.hubspot_access_token IS 'HubSpot Private App access token';
COMMENT ON COLUMN public.clients.hubspot_sync_status IS 'Status: disconnected, healthy, syncing, error';
COMMENT ON COLUMN public.client_settings.hubspot_sync_enabled IS 'Toggle for HubSpot sync';
COMMENT ON COLUMN public.client_settings.hubspot_funded_pipeline_id IS 'Deal pipeline ID for funded investors';
COMMENT ON COLUMN public.client_settings.hubspot_funded_stage_ids IS 'Deal stage IDs that indicate funded';
COMMENT ON COLUMN public.client_settings.hubspot_committed_stage_ids IS 'Deal stage IDs that indicate committed';