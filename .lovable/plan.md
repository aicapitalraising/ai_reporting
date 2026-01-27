
# Data Discrepancy Tracking Implementation Plan

## Overview
This plan creates a complete system to track and surface discrepancies between webhook-ingested data and GHL API-synced data, ensuring data integrity and transparent reporting.

## Architecture Flow

```text
+------------------+       +-------------------+       +--------------------+
| Webhook Ingests  | ----> | Database (leads,  | <---- | GHL API Sync       |
| (Real-time)      |       | calls, etc.)      |       | (Scheduled)        |
+------------------+       +-------------------+       +--------------------+
                                    |
                           +--------v--------+
                           | Discrepancy     |
                           | Detection Logic |
                           +--------+--------+
                                    |
                           +--------v--------+
                           | data_           |
                           | discrepancies   |
                           +--------+--------+
                                    |
                           +--------v--------+
                           | Dashboard UI    |
                           | (Alert Banner)  |
                           +----------------+
```

---

## Technical Implementation

### 1. Database Migration: Create `data_discrepancies` Table

**New table schema:**
- `id` (UUID, primary key)
- `client_id` (UUID, foreign key to clients)
- `detected_at` (timestamp with time zone)
- `discrepancy_type` (text) - e.g., 'lead_count_mismatch', 'call_count_mismatch', 'missing_leads_in_api', 'missing_leads_in_db'
- `date_range_start` (date)
- `date_range_end` (date)
- `webhook_count` (integer) - count from webhook logs
- `api_count` (integer) - count from API sync
- `db_count` (integer) - count currently in database
- `difference` (integer) - calculated gap
- `severity` (text) - 'info', 'warning', 'critical'
- `status` (text) - 'open', 'acknowledged', 'resolved'
- `resolution_notes` (text, nullable)
- `resolved_at` (timestamp, nullable)
- `sync_log_id` (UUID, nullable) - link to the sync that detected this

**RLS policies:**
- Public SELECT, INSERT, UPDATE for dashboard access
- Service role full access for Edge Functions

### 2. Edge Function Update: `sync-ghl-contacts`

**New discrepancy detection function:**

After syncing contacts, the function will:
1. Query `webhook_logs` for the client in the last 24 hours, filtering by `webhook_type = 'lead'`
2. Query `leads` table for records created in the last 24 hours
3. Compare the API contact count fetched during sync
4. Calculate discrepancies:
   - If `webhook_count > db_count`: Some webhooks may have failed to create leads
   - If `api_count > db_count`: Missing leads from API sync
   - If `db_count > api_count`: Leads exist locally but not in GHL (manual entries or webhook-only)
5. Insert discrepancy record if difference exceeds a threshold (e.g., >5%)

**Key logic to add:**
```typescript
async function detectDiscrepancies(
  supabase: any,
  clientId: string,
  apiContactsTotal: number,
  syncedContacts: { created: number; updated: number }
): Promise<void> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Count webhook leads in last 24h
  const { count: webhookCount } = await supabase
    .from('webhook_logs')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('webhook_type', 'lead')
    .eq('status', 'success')
    .gte('processed_at', yesterday.toISOString());
  
  // Count DB leads in last 24h
  const { count: dbCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', yesterday.toISOString());
  
  // Calculate discrepancy
  const difference = Math.abs((webhookCount || 0) - (dbCount || 0));
  const percentDiff = dbCount ? (difference / dbCount) * 100 : 0;
  
  // Only log if significant (>5% or >3 records)
  if (difference > 3 || percentDiff > 5) {
    const severity = percentDiff > 20 ? 'critical' : percentDiff > 10 ? 'warning' : 'info';
    
    await supabase.from('data_discrepancies').insert({
      client_id: clientId,
      discrepancy_type: 'lead_count_mismatch',
      date_range_start: yesterday.toISOString().split('T')[0],
      date_range_end: today.toISOString().split('T')[0],
      webhook_count: webhookCount || 0,
      api_count: apiContactsTotal,
      db_count: dbCount || 0,
      difference,
      severity,
      status: 'open',
    });
  }
}
```

### 3. Frontend Hook: `useDataDiscrepancies`

**New hook at `src/hooks/useDataDiscrepancies.ts`:**
- Fetches open discrepancies for all clients or a specific client
- Provides mutation to acknowledge/resolve discrepancies
- Filters by severity and status

```typescript
export function useDataDiscrepancies(clientId?: string) {
  return useQuery({
    queryKey: ['data-discrepancies', clientId],
    queryFn: async () => {
      let query = supabase
        .from('data_discrepancies')
        .select('*, clients(name)')
        .eq('status', 'open')
        .order('detected_at', { ascending: false });
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

### 4. Dashboard Component: `DataDiscrepancyBanner`

**New component at `src/components/dashboard/DataDiscrepancyBanner.tsx`:**

Displays at the top of the agency dashboard when discrepancies exist:
- Shows count of open discrepancies
- Color-coded by severity (yellow for warning, red for critical)
- Click to expand and see details
- Buttons to acknowledge or investigate

**UI mockup structure:**
```
+--------------------------------------------------------------+
| ⚠️ 3 Data Discrepancies Detected                    [View All] |
|   2 critical • 1 warning                                      |
+--------------------------------------------------------------+
```

When expanded or in modal:
```
+--------------------------------------------------------------+
| Client: Blue Capital                                          |
| Type: Lead Count Mismatch                                     |
| Period: Jan 26 - Jan 27                                       |
| Webhook: 45 | API: 52 | DB: 48 | Gap: 4                       |
| Severity: Warning                                             |
| [Acknowledge] [Mark Resolved]                                 |
+--------------------------------------------------------------+
```

### 5. Integration Points

**Index.tsx (Agency Dashboard):**
- Import and render `DataDiscrepancyBanner` below the header
- Pass discrepancies data from the new hook

**ClientDetail.tsx (Client Dashboard):**
- Show client-specific discrepancies in the header area
- Smaller inline alert for individual client view

**AgencySettingsModal.tsx:**
- Add "Data Quality" tab showing discrepancy history
- Option to configure discrepancy detection thresholds

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/xxx_create_data_discrepancies.sql` | Create | Database table and RLS policies |
| `supabase/functions/sync-ghl-contacts/index.ts` | Modify | Add discrepancy detection after sync |
| `src/hooks/useDataDiscrepancies.ts` | Create | Fetch and manage discrepancy data |
| `src/components/dashboard/DataDiscrepancyBanner.tsx` | Create | UI component for alerts |
| `src/pages/Index.tsx` | Modify | Integrate banner component |
| `src/pages/ClientDetail.tsx` | Modify | Show client-specific alerts |
| `src/integrations/supabase/types.ts` | Auto-update | Type definitions for new table |

---

## Detection Logic Summary

| Discrepancy Type | Trigger Condition | Severity Rules |
|------------------|-------------------|----------------|
| `lead_count_mismatch` | Webhook count != DB count | >20% = critical, >10% = warning |
| `call_count_mismatch` | API calls != DB calls | >20% = critical, >10% = warning |
| `missing_api_leads` | DB has leads not in API | Always info (expected for webhook-only) |
| `failed_webhooks` | Webhook error count > 0 | >5 = critical, >2 = warning |

---

## Benefits

1. **Transparency**: Users see when data may be incomplete
2. **Auditability**: Historical record of all detected discrepancies
3. **Proactive**: Alerts appear automatically without manual checking
4. **Actionable**: Clear resolution workflow with acknowledge/resolve states
5. **Confidence**: Ties into existing `metricConfidence.ts` system

