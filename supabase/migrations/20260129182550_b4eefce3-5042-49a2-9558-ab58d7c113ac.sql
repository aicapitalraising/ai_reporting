-- Create client_pipelines table
CREATE TABLE public.client_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ghl_pipeline_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, ghl_pipeline_id)
);

-- Create pipeline_stages table
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.client_pipelines(id) ON DELETE CASCADE,
  ghl_stage_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pipeline_id, ghl_stage_id)
);

-- Create pipeline_opportunities table
CREATE TABLE public.pipeline_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.client_pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  ghl_opportunity_id TEXT NOT NULL,
  ghl_contact_id TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  monetary_value NUMERIC DEFAULT 0,
  source TEXT,
  status TEXT DEFAULT 'open',
  last_stage_change_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pipeline_id, ghl_opportunity_id)
);

-- Create contact_timeline_events table
CREATE TABLE public.contact_timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ghl_contact_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_subtype TEXT,
  title TEXT,
  body TEXT,
  event_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_client_pipelines_client_id ON public.client_pipelines(client_id);
CREATE INDEX idx_pipeline_stages_pipeline_id ON public.pipeline_stages(pipeline_id);
CREATE INDEX idx_pipeline_opportunities_pipeline_id ON public.pipeline_opportunities(pipeline_id);
CREATE INDEX idx_pipeline_opportunities_stage_id ON public.pipeline_opportunities(stage_id);
CREATE INDEX idx_pipeline_opportunities_ghl_contact_id ON public.pipeline_opportunities(ghl_contact_id);
CREATE INDEX idx_contact_timeline_events_client_id ON public.contact_timeline_events(client_id);
CREATE INDEX idx_contact_timeline_events_ghl_contact_id ON public.contact_timeline_events(ghl_contact_id);
CREATE INDEX idx_contact_timeline_events_event_at ON public.contact_timeline_events(event_at);

-- Enable RLS on all tables
ALTER TABLE public.client_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_pipelines
CREATE POLICY "Public can view client_pipelines"
ON public.client_pipelines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_pipelines.client_id
    AND (clients.public_token IS NOT NULL OR clients.slug IS NOT NULL)
  )
);

CREATE POLICY "Public can insert client_pipelines"
ON public.client_pipelines FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update client_pipelines"
ON public.client_pipelines FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete client_pipelines"
ON public.client_pipelines FOR DELETE
USING (true);

-- RLS policies for pipeline_stages
CREATE POLICY "Public can view pipeline_stages"
ON public.pipeline_stages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_pipelines cp
    JOIN public.clients c ON c.id = cp.client_id
    WHERE cp.id = pipeline_stages.pipeline_id
    AND (c.public_token IS NOT NULL OR c.slug IS NOT NULL)
  )
);

CREATE POLICY "Public can insert pipeline_stages"
ON public.pipeline_stages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update pipeline_stages"
ON public.pipeline_stages FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete pipeline_stages"
ON public.pipeline_stages FOR DELETE
USING (true);

-- RLS policies for pipeline_opportunities
CREATE POLICY "Public can view pipeline_opportunities"
ON public.pipeline_opportunities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_pipelines cp
    JOIN public.clients c ON c.id = cp.client_id
    WHERE cp.id = pipeline_opportunities.pipeline_id
    AND (c.public_token IS NOT NULL OR c.slug IS NOT NULL)
  )
);

CREATE POLICY "Public can insert pipeline_opportunities"
ON public.pipeline_opportunities FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update pipeline_opportunities"
ON public.pipeline_opportunities FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete pipeline_opportunities"
ON public.pipeline_opportunities FOR DELETE
USING (true);

-- RLS policies for contact_timeline_events
CREATE POLICY "Public can view contact_timeline_events"
ON public.contact_timeline_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = contact_timeline_events.client_id
    AND (clients.public_token IS NOT NULL OR clients.slug IS NOT NULL)
  )
);

CREATE POLICY "Public can insert contact_timeline_events"
ON public.contact_timeline_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can delete contact_timeline_events"
ON public.contact_timeline_events FOR DELETE
USING (true);

-- Add trigger for updated_at on pipeline_opportunities
CREATE TRIGGER update_pipeline_opportunities_updated_at
BEFORE UPDATE ON public.pipeline_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();