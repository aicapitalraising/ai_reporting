-- Create gpt_files table for per-GPT file storage
CREATE TABLE public.gpt_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpt_id UUID NOT NULL REFERENCES public.custom_gpts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'document',
  file_url TEXT,
  website_url TEXT,
  content TEXT,
  character_count INTEGER DEFAULT 0,
  estimated_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gpt_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for gpt_files
CREATE POLICY "Public can view gpt_files" ON public.gpt_files FOR SELECT USING (true);
CREATE POLICY "Public can insert gpt_files" ON public.gpt_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete gpt_files" ON public.gpt_files FOR DELETE USING (true);

-- Add token tracking columns to knowledge_base_documents
ALTER TABLE public.knowledge_base_documents 
ADD COLUMN IF NOT EXISTS character_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_tokens INTEGER DEFAULT 0;

-- Create storage bucket for GPT files
INSERT INTO storage.buckets (id, name, public) VALUES ('gpt-files', 'gpt-files', true) ON CONFLICT DO NOTHING;

-- Storage policies for gpt-files bucket
CREATE POLICY "Public can view gpt-files" ON storage.objects FOR SELECT USING (bucket_id = 'gpt-files');
CREATE POLICY "Public can upload gpt-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gpt-files');
CREATE POLICY "Public can delete gpt-files" ON storage.objects FOR DELETE USING (bucket_id = 'gpt-files');