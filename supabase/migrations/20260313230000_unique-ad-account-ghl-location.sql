-- Prevent duplicate ad accounts across clients
-- Each Meta ad account should only be assigned to one client
CREATE UNIQUE INDEX IF NOT EXISTS unique_meta_ad_account_id
  ON clients (meta_ad_account_id)
  WHERE meta_ad_account_id IS NOT NULL;

-- Prevent duplicate GHL locations across clients
CREATE UNIQUE INDEX IF NOT EXISTS unique_ghl_location_id
  ON clients (ghl_location_id)
  WHERE ghl_location_id IS NOT NULL;
