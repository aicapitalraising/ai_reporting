import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OutreachCampaign {
  id: string;
  client_id: string;
  campaign_name: string;
  campaign_type: 'sms' | 'imessage' | 'voice_call' | 'sequence';
  status: 'draft' | 'active' | 'paused' | 'completed';
  trigger_event: string | null;
  message_template: string | null;
  voice_agent_prompt: string | null;
  voice_id: string | null;
  delay_minutes: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface OutreachMessage {
  id: string;
  campaign_id: string | null;
  client_id: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  channel: 'sms' | 'imessage' | 'voice_call';
  direction: 'inbound' | 'outbound';
  status: string;
  message_body: string | null;
  call_duration_seconds: number | null;
  call_summary: string | null;
  call_transcript: string | null;
  call_sentiment: string | null;
  sendblue_message_id: string | null;
  elevenlabs_call_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface OutreachSequence {
  id: string;
  campaign_id: string;
  step_number: number;
  channel: 'sms' | 'imessage' | 'voice_call';
  delay_hours: number;
  message_template: string | null;
  voice_agent_prompt: string | null;
  condition: string | null;
  created_at: string;
}

export function useOutreachCampaigns(clientId?: string) {
  return useQuery({
    queryKey: ['outreach-campaigns', clientId],
    queryFn: async () => {
      let query = supabase
        .from('outreach_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OutreachCampaign[];
    },
  });
}

export function useOutreachMessages(clientId?: string, campaignId?: string) {
  return useQuery({
    queryKey: ['outreach-messages', clientId, campaignId],
    queryFn: async () => {
      let query = supabase
        .from('outreach_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (clientId) query = query.eq('client_id', clientId);
      if (campaignId) query = query.eq('campaign_id', campaignId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OutreachMessage[];
    },
  });
}

export function useOutreachStats() {
  return useQuery({
    queryKey: ['outreach-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: todayMessages, error } = await supabase
        .from('outreach_messages')
        .select('channel, status, direction')
        .gte('created_at', today + 'T00:00:00.000Z');
      if (error) throw error;

      const msgs = todayMessages || [];
      const outbound = msgs.filter(m => m.direction === 'outbound');
      const smsToday = outbound.filter(m => m.channel === 'sms' || m.channel === 'imessage').length;
      const callsToday = outbound.filter(m => m.channel === 'voice_call').length;
      const replied = outbound.filter(m => m.status === 'replied').length;
      const responseRate = outbound.length > 0 ? (replied / outbound.length) * 100 : 0;

      // Active campaigns count
      const { count: activeCampaigns } = await supabase
        .from('outreach_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      return {
        messagesToday: smsToday,
        callsToday,
        responseRate,
        activeCampaigns: activeCampaigns || 0,
      };
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: Partial<OutreachCampaign>) => {
      const { data, error } = await supabase
        .from('outreach_campaigns')
        .insert(campaign as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach-campaigns'] });
      toast.success('Campaign created');
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('outreach_campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach-campaigns'] });
      toast.success('Campaign status updated');
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      phone: string;
      message: string;
      channel?: string;
      contact_id?: string;
      contact_name?: string;
      campaign_id?: string;
      client_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-sms-imessage', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach-messages'] });
      qc.invalidateQueries({ queryKey: ['outreach-stats'] });
      toast.success('Message sent');
    },
    onError: (err: any) => toast.error(`Send failed: ${err.message}`),
  });
}

export function useMakeAICall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      phone: string;
      agent_prompt?: string;
      voice_id?: string;
      contact_id?: string;
      contact_name?: string;
      campaign_id?: string;
      client_id: string;
      client_context?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('make-ai-call', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach-messages'] });
      qc.invalidateQueries({ queryKey: ['outreach-stats'] });
      toast.success('AI call initiated');
    },
    onError: (err: any) => toast.error(`Call failed: ${err.message}`),
  });
}
