ALTER TABLE public.agency_settings
ADD COLUMN IF NOT EXISTS selected_openai_model text DEFAULT 'gpt-5',
ADD COLUMN IF NOT EXISTS selected_gemini_model text DEFAULT 'gemini-2.5-pro',
ADD COLUMN IF NOT EXISTS selected_grok_model text DEFAULT 'grok-3',
ADD COLUMN IF NOT EXISTS xai_api_key text;