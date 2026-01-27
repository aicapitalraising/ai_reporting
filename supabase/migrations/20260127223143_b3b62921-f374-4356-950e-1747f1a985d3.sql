-- Create funnel_campaigns table
CREATE TABLE public.funnel_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f3f4f6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add campaign_id to existing steps table
ALTER TABLE public.client_funnel_steps 
ADD COLUMN campaign_id UUID REFERENCES public.funnel_campaigns(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.funnel_campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for funnel_campaigns
CREATE POLICY "Allow all operations on funnel_campaigns" 
ON public.funnel_campaigns 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_funnel_campaigns_client_id ON public.funnel_campaigns(client_id);
CREATE INDEX idx_funnel_steps_campaign_id ON public.client_funnel_steps(campaign_id);