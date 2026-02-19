
-- Create task_notifications table for @mentions
CREATE TABLE public.task_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.agency_members(id) ON DELETE CASCADE,
  triggered_by TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

-- Allow all reads/writes (no auth in this app)
CREATE POLICY "Allow all access to task_notifications"
  ON public.task_notifications FOR ALL USING (true) WITH CHECK (true);

-- Index for fast member-specific queries
CREATE INDEX idx_task_notifications_member ON public.task_notifications(member_id, is_read, created_at DESC);
