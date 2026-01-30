-- Fix RLS policy consistency for client_settings table
-- Change from "TO anon, authenticated" to "TO public" for consistent anonymous access

DROP POLICY IF EXISTS "Public can view client_settings" ON client_settings;

CREATE POLICY "Public can view client_settings"
ON client_settings FOR SELECT
TO public
USING (true);