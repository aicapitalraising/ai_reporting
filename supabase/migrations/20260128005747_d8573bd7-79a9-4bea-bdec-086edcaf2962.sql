-- Create knowledge base documents table
CREATE TABLE public.knowledge_base_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'pdf', -- pdf, url, text
  file_url TEXT,
  website_url TEXT,
  content TEXT,
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom GPTs/agents table
CREATE TABLE public.custom_gpts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  icon TEXT DEFAULT 'bot',
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table for GPT knowledge base assignments
CREATE TABLE public.gpt_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gpt_id UUID NOT NULL REFERENCES public.custom_gpts(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.knowledge_base_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gpt_id, document_id)
);

-- Create AI conversations table for the AI tab (separate from agency chat)
CREATE TABLE public.ai_hub_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gpt_id UUID REFERENCES public.custom_gpts(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI hub messages
CREATE TABLE public.ai_hub_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_hub_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_gpts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpt_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hub_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hub_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view knowledge_base_documents" ON public.knowledge_base_documents FOR SELECT USING (true);
CREATE POLICY "Public can insert knowledge_base_documents" ON public.knowledge_base_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update knowledge_base_documents" ON public.knowledge_base_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete knowledge_base_documents" ON public.knowledge_base_documents FOR DELETE USING (true);

CREATE POLICY "Public can view custom_gpts" ON public.custom_gpts FOR SELECT USING (true);
CREATE POLICY "Public can insert custom_gpts" ON public.custom_gpts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update custom_gpts" ON public.custom_gpts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete custom_gpts" ON public.custom_gpts FOR DELETE USING (true);

CREATE POLICY "Public can view gpt_knowledge_base" ON public.gpt_knowledge_base FOR SELECT USING (true);
CREATE POLICY "Public can insert gpt_knowledge_base" ON public.gpt_knowledge_base FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete gpt_knowledge_base" ON public.gpt_knowledge_base FOR DELETE USING (true);

CREATE POLICY "Public can view ai_hub_conversations" ON public.ai_hub_conversations FOR SELECT USING (true);
CREATE POLICY "Public can insert ai_hub_conversations" ON public.ai_hub_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update ai_hub_conversations" ON public.ai_hub_conversations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete ai_hub_conversations" ON public.ai_hub_conversations FOR DELETE USING (true);

CREATE POLICY "Public can view ai_hub_messages" ON public.ai_hub_messages FOR SELECT USING (true);
CREATE POLICY "Public can insert ai_hub_messages" ON public.ai_hub_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete ai_hub_messages" ON public.ai_hub_messages FOR DELETE USING (true);