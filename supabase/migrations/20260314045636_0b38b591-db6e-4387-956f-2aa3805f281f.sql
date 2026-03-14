-- Add 2-hour cron job for GHL contacts sync (all clients)
SELECT cron.schedule(
  'sync-ghl-all-clients-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jgwwmtuvjlmzapwqiabu.supabase.co/functions/v1/sync-ghl-all-clients',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnd3dtdHV2amxtemFwd3FpYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDkzODIsImV4cCI6MjA4MzMyNTM4Mn0.STFrUoif30xXQCjabc3skP6_tTnVIATwHhwWxeZoUr4"}'::jsonb,
    body := '{"sinceDateDays": 7}'::jsonb
  ) AS request_id;
  $$
);