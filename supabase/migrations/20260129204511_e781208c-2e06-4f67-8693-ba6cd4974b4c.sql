-- New junction table for multiple assignees (supports both individual members and pods)
CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.agency_members(id) ON DELETE CASCADE,
  pod_id UUID REFERENCES public.agency_pods(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_assignee CHECK (member_id IS NOT NULL OR pod_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public can view task_assignees" 
ON public.task_assignees 
FOR SELECT USING (true);

CREATE POLICY "Public can insert task_assignees" 
ON public.task_assignees 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update task_assignees" 
ON public.task_assignees 
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete task_assignees" 
ON public.task_assignees 
FOR DELETE USING (true);

-- Create index for faster lookups
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_member_id ON public.task_assignees(member_id);
CREATE INDEX idx_task_assignees_pod_id ON public.task_assignees(pod_id);