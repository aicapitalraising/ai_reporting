-- Create agency_pods table
CREATE TABLE public.agency_pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on agency_pods
ALTER TABLE public.agency_pods ENABLE ROW LEVEL SECURITY;

-- RLS policies for agency_pods
CREATE POLICY "Public can view agency_pods" ON public.agency_pods FOR SELECT USING (true);
CREATE POLICY "Public can insert agency_pods" ON public.agency_pods FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update agency_pods" ON public.agency_pods FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete agency_pods" ON public.agency_pods FOR DELETE USING (true);

-- Add pod_id column to agency_members
ALTER TABLE public.agency_members 
  ADD COLUMN pod_id UUID REFERENCES public.agency_pods(id) ON DELETE SET NULL;

-- Create client_pod_assignments table
CREATE TABLE public.client_pod_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pod_id UUID NOT NULL REFERENCES public.agency_pods(id) ON DELETE CASCADE,
  is_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, pod_id)
);

-- Enable RLS on client_pod_assignments
ALTER TABLE public.client_pod_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_pod_assignments
CREATE POLICY "Public can view client_pod_assignments" ON public.client_pod_assignments FOR SELECT USING (true);
CREATE POLICY "Public can insert client_pod_assignments" ON public.client_pod_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update client_pod_assignments" ON public.client_pod_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete client_pod_assignments" ON public.client_pod_assignments FOR DELETE USING (true);

-- Seed initial pods
INSERT INTO public.agency_pods (name, description, color) VALUES
  ('Creatives', 'Creative design and ad production team', '#ec4899'),
  ('Media Buying', 'Media buying and campaign management', '#3b82f6'),
  ('Account Management', 'Client relationship and strategy', '#10b981'),
  ('CRM', 'CRM setup and automation', '#f59e0b'),
  ('Project Management', 'Project oversight and coordination', '#8b5cf6');

-- Trigger for updated_at on agency_pods
CREATE TRIGGER update_agency_pods_updated_at
  BEFORE UPDATE ON public.agency_pods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();