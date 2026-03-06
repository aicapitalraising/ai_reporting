-- ============================================
-- RetargetIQ Integration Setup
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Add RetargetIQ columns to agency_settings
ALTER TABLE agency_settings
ADD COLUMN IF NOT EXISTS retargetiq_api_key text,
ADD COLUMN IF NOT EXISTS retargetiq_website text DEFAULT 'default';

-- 2. Add RetargetIQ tracking to client_settings
ALTER TABLE client_settings
ADD COLUMN IF NOT EXISTS retargetiq_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS retargetiq_last_enrichment_at timestamptz;

-- 3. Index for efficient unenriched leads lookup
CREATE INDEX IF NOT EXISTS idx_leads_retargetiq_unenriched
ON leads (client_id, created_at DESC)
WHERE custom_fields IS NULL OR custom_fields->>'retargetiq_enriched_at' IS NULL;

-- 4. Set the RetargetIQ API key
UPDATE agency_settings
SET retargetiq_api_key = '25a1f93b-3a3f-4a13-97ae-10539d32d813',
    retargetiq_website = 'default',
    updated_at = now();

-- 5. Verify setup
SELECT id, retargetiq_api_key, retargetiq_website FROM agency_settings LIMIT 1;
