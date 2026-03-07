-- ============================================================
-- Cron Job Setup for Automated Syncing
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 1. GHL All-Clients Sync - Every 4 hours
-- ============================================================
-- Remove existing job if present (ignore errors)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-ghl-all-clients-4h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-ghl-all-clients-4h',
  '0 0,4,8,12,16,20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jgwwmtuvjlmzapwqiabu.supabase.co/functions/v1/sync-ghl-all-clients',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnd3dtdHV2amxtemFwd3FpYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDkzODIsImV4cCI6MjA4MzMyNTM4Mn0.STFrUoif30xXQCjabc3skP6_tTnVIATwHhwWxeZoUr4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- 2. Hourly Calendar Sync - Every hour at :15
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('hourly-calendar-sync');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'hourly-calendar-sync',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jgwwmtuvjlmzapwqiabu.supabase.co/functions/v1/sync-calendar-appointments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnd3dtdHV2amxtemFwd3FpYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDkzODIsImV4cCI6MjA4MzMyNTM4Mn0.STFrUoif30xXQCjabc3skP6_tTnVIATwHhwWxeZoUr4"}'::jsonb,
    body := concat('{"clientId":"', id::text, '"}')::jsonb
  ) AS request_id
  FROM clients
  WHERE status = 'active'
    AND ghl_api_key IS NOT NULL
    AND ghl_location_id IS NOT NULL
    AND id IN (
      SELECT client_id FROM client_settings
      WHERE (tracked_calendar_ids IS NOT NULL AND array_length(tracked_calendar_ids, 1) > 0)
         OR (reconnect_calendar_ids IS NOT NULL AND array_length(reconnect_calendar_ids, 1) > 0)
    );
  $$
);

-- ============================================================
-- 3. HubSpot All-Clients Sync - Every 4 hours (offset 1h from GHL)
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('sync-hubspot-all-clients-4h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-hubspot-all-clients-4h',
  '0 1,5,9,13,17,21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jgwwmtuvjlmzapwqiabu.supabase.co/functions/v1/sync-hubspot-all-clients',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnd3dtdHV2amxtemFwd3FpYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDkzODIsImV4cCI6MjA4MzMyNTM4Mn0.STFrUoif30xXQCjabc3skP6_tTnVIATwHhwWxeZoUr4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- 4. Daily Master Sync - 7:00 AM UTC
-- Runs: Meta Ads → GHL → HubSpot → Recalculate Metrics
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('daily-master-sync-7am');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'daily-master-sync-7am',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jgwwmtuvjlmzapwqiabu.supabase.co/functions/v1/daily-master-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnd3dtdHV2amxtemFwd3FpYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDkzODIsImV4cCI6MjA4MzMyNTM4Mn0.STFrUoif30xXQCjabc3skP6_tTnVIATwHhwWxeZoUr4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- 5. Verify: List all active cron jobs
-- ============================================================
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
