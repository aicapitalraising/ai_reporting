
-- Create client_offers table for offers, PDFs, images, etc.
CREATE TABLE public.client_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT, -- pdf, png, jpg, doc, etc.
  file_size_bytes BIGINT,
  offer_type TEXT NOT NULL DEFAULT 'file', -- 'offer', 'file', 'document'
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_offers ENABLE ROW LEVEL SECURITY;

-- RLS policies matching existing pattern
CREATE POLICY "Public can view client_offers"
  ON public.client_offers FOR SELECT USING (true);

CREATE POLICY "Public can insert client_offers"
  ON public.client_offers FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update client_offers"
  ON public.client_offers FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete client_offers"
  ON public.client_offers FOR DELETE USING (true);

-- Create storage bucket for offer files
INSERT INTO storage.buckets (id, name, public) VALUES ('client-offers', 'client-offers', true);

-- Storage policies
CREATE POLICY "Anyone can view client offer files"
  ON storage.objects FOR SELECT USING (bucket_id = 'client-offers');

CREATE POLICY "Anyone can upload client offer files"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-offers');

CREATE POLICY "Anyone can delete client offer files"
  ON storage.objects FOR DELETE USING (bucket_id = 'client-offers');
