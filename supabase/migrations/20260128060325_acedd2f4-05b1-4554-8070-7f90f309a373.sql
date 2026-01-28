-- Add ghl_synced_at column to leads table for tracking last sync timestamp
ALTER TABLE public.leads 
ADD COLUMN ghl_synced_at TIMESTAMP WITH TIME ZONE;