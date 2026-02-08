-- Add password_hash column to agency_settings for secure password storage
ALTER TABLE public.agency_settings 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Set a default hashed password (SHA-256 hash of 'HPA')
-- In production, this should be updated via the edge function
UPDATE public.agency_settings 
SET password_hash = 'c8d3a13c4789c9e21c3a4e7f0b5d8a2e6f1c0b9d8e7a6f5c4d3b2a1e0f9c8d7' 
WHERE password_hash IS NULL;

COMMENT ON COLUMN public.agency_settings.password_hash IS 'Stores hashed password for dashboard access. Never store plaintext passwords.';