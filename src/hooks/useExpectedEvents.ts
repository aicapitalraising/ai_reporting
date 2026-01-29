import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExpectedEvent {
  id: string;
  step_id: string;
  platform: 'meta' | 'google' | 'linkedin' | 'tiktok';
  event_name: string;
  is_custom: boolean;
  created_at: string;
}

// Standard events by platform for autocomplete
export const STANDARD_EVENTS = {
  meta: [
    'PageView', 'Lead', 'Schedule', 'CompleteRegistration', 'Purchase',
    'ViewContent', 'InitiateCheckout', 'AddToCart', 'AddPaymentInfo',
    'Contact', 'FindLocation', 'CustomizeProduct', 'Donate', 'Search',
    'StartTrial', 'Subscribe'
  ],
  google: [
    'page_view', 'conversion', 'generate_lead', 'purchase', 'sign_up',
    'add_to_cart', 'begin_checkout', 'view_item', 'search', 'login',
    'add_payment_info', 'add_to_wishlist'
  ],
  linkedin: ['conversion', 'page_load'],
  tiktok: [
    'PageView', 'ViewContent', 'ClickButton', 'SubmitForm',
    'CompleteRegistration', 'PlaceAnOrder', 'Contact', 'Download',
    'Search', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'CompletePayment'
  ],
};

export const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta (Facebook)',
  google: 'Google Ads / Analytics',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

// Fetch expected events for a step
export function useExpectedEvents(stepId: string | undefined) {
  return useQuery({
    queryKey: ['expected-events', stepId],
    queryFn: async () => {
      if (!stepId) return [];
      
      const { data, error } = await supabase
        .from('pixel_expected_events')
        .select('*')
        .eq('step_id', stepId)
        .order('platform', { ascending: true });
      
      if (error) throw error;
      return data as ExpectedEvent[];
    },
    enabled: !!stepId,
  });
}

// Add expected event
export function useAddExpectedEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      stepId, 
      platform, 
      eventName, 
      isCustom = false 
    }: { 
      stepId: string; 
      platform: 'meta' | 'google' | 'linkedin' | 'tiktok'; 
      eventName: string;
      isCustom?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('pixel_expected_events')
        .insert({
          step_id: stepId,
          platform,
          event_name: eventName,
          is_custom: isCustom,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ExpectedEvent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expected-events', variables.stepId] });
    },
  });
}

// Remove expected event
export function useRemoveExpectedEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, stepId }: { id: string; stepId: string }) => {
      const { error } = await supabase
        .from('pixel_expected_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expected-events', variables.stepId] });
    },
  });
}

// Bulk update expected events for a step
export function useBulkUpdateExpectedEvents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      stepId, 
      events 
    }: { 
      stepId: string; 
      events: Array<{ platform: 'meta' | 'google' | 'linkedin' | 'tiktok'; event_name: string; is_custom: boolean }>;
    }) => {
      // Delete existing
      await supabase
        .from('pixel_expected_events')
        .delete()
        .eq('step_id', stepId);
      
      // Insert new
      if (events.length > 0) {
        const { error } = await supabase
          .from('pixel_expected_events')
          .insert(events.map(e => ({
            step_id: stepId,
            platform: e.platform,
            event_name: e.event_name,
            is_custom: e.is_custom,
          })));
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expected-events', variables.stepId] });
    },
  });
}
