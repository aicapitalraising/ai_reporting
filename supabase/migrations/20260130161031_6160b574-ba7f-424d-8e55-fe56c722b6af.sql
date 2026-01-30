-- Add SELECT policies for tables missing them that are needed for public reports
CREATE POLICY "Public can view client_funnel_steps" ON public.client_funnel_steps FOR SELECT USING (true);
CREATE POLICY "Public can view funnel_campaigns" ON public.funnel_campaigns FOR SELECT USING (true);
CREATE POLICY "Public can view sync_logs" ON public.sync_logs FOR SELECT USING (true);
CREATE POLICY "Public can view alert_configs" ON public.alert_configs FOR SELECT USING (true);