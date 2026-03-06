-- Add public_visible_tabs JSONB to client_settings for controlling which tabs are shown on the public report
ALTER TABLE public.client_settings
ADD COLUMN IF NOT EXISTS public_visible_tabs JSONB DEFAULT '{"overview": true, "attribution": true, "records": true, "tasks": true, "creatives": true, "funnel": true, "pipeline": true}'::jsonb;

COMMENT ON COLUMN public.client_settings.public_visible_tabs IS 'Controls which tabs are visible on the public shareable link. Keys: overview, attribution, records, tasks, creatives, funnel, pipeline';
