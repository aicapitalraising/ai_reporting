-- Add SELECT policy for leads table so public links can access lead data
CREATE POLICY "Public can view leads"
ON public.leads
FOR SELECT
USING (true);