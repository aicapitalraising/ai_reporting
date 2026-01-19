-- Add INSERT and UPDATE policies for client_settings table
CREATE POLICY "Public can insert client_settings"
ON public.client_settings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update client_settings"
ON public.client_settings
FOR UPDATE
USING (true)
WITH CHECK (true);