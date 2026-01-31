
# Comprehensive GHL API-Only Sync Implementation Plan

## Overview

This plan implements a complete API-based synchronization system for GoHighLevel (GHL) data, replacing webhook-based lead creation with a robust hourly sync architecture. The system will track every stage of the funnel with configurable calendar and pipeline mappings.

## Current State Analysis

The codebase already has:
- **Leads table**: Syncs contacts from GHL via `sync-ghl-contacts` edge function
- **Calls table**: Currently relies on webhook data with limited GHL enrichment
- **Funded investors table**: Created from tags and pipeline stages
- **Daily metrics table**: Aggregates data for reporting
- **Sync logs table**: Tracks sync operations with status and timestamps

**Gaps identified**:
1. No calendar ID configuration for tracking booked/reconnect calls
2. Call stage tracking (showed/no-show/cancelled/rescheduled) needs GHL appointment API integration
3. No funded investor pipeline stage mapping UI
4. No visual indicator for clients with broken/missing GHL sync
5. Daily metrics not recalculated based on actual GHL appointment data

---

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Extend `client_settings` table
Add new columns for calendar and pipeline mapping:
- `tracked_calendar_ids` (TEXT[]) - Array of GHL calendar IDs to track booked calls
- `reconnect_calendar_ids` (TEXT[]) - Array of GHL calendar IDs for reconnect calls
- `funded_pipeline_id` (TEXT) - GHL pipeline ID for funded investor detection
- `funded_stage_ids` (TEXT[]) - Array of stage IDs that indicate "funded"
- `committed_stage_ids` (TEXT[]) - Array of stage IDs that indicate "committed"

#### 1.2 Extend `clients` table
Add sync health tracking:
- `last_ghl_sync_at` (TIMESTAMPTZ) - Last successful GHL sync timestamp
- `ghl_sync_status` (TEXT) - 'healthy', 'stale', 'error', 'not_configured'
- `ghl_sync_error` (TEXT) - Last error message if sync failed

#### 1.3 Extend `calls` table
Add GHL appointment tracking fields:
- `ghl_appointment_id` (TEXT) - GHL appointment ID
- `ghl_calendar_id` (TEXT) - Which calendar this came from
- `appointment_status` (TEXT) - 'confirmed', 'showed', 'no_showed', 'cancelled', 'rescheduled'
- `booked_at` (TIMESTAMPTZ) - When the appointment was booked

---

### Phase 2: Enhanced Sync Edge Function

#### 2.1 Refactor `sync-ghl-contacts` to support appointment sync

Add new sync modes:
- `mode: 'contacts'` - Sync leads only (existing behavior)
- `mode: 'appointments'` - Sync appointments from tracked calendars
- `mode: 'full'` - Sync both contacts and appointments
- `mode: 'health_check'` - Validate API credentials only

#### 2.2 Appointment Sync Logic

The function will:
1. Fetch client's `tracked_calendar_ids` and `reconnect_calendar_ids` from settings
2. For each calendar, fetch appointments from GHL `/calendars/{calendarId}/events` endpoint
3. Upsert into `calls` table with:
   - Match by `(client_id, ghl_appointment_id)` unique constraint
   - Set `is_reconnect = true` if from reconnect calendar
   - Parse appointment status from GHL: `confirmed`, `showed`, `no_showed`, `cancelled`, `rescheduled`
   - Link to `lead_id` via contact matching (email/phone/external_id)

#### 2.3 Daily Metrics Recalculation

After syncing appointments, recalculate `daily_metrics` for affected dates:
- Count leads by `created_at` date
- Count calls by `scheduled_at` date
- Count showed calls where `appointment_status = 'showed'`
- Count reconnect calls where `is_reconnect = true`
- Count reconnect showed where both conditions met

---

### Phase 3: Client Settings UI Updates

#### 3.1 Add Calendar Configuration Section

In `ClientSettingsModal.tsx` → Integrations tab, add:

```text
[Calendar Tracking]
- Multi-select dropdown for "Booked Call Calendars"
- Multi-select dropdown for "Reconnect Call Calendars"
- Fetches available calendars from GHL `/calendars/` endpoint
```

#### 3.2 Add Pipeline Stage Mapping Section

```text
[Pipeline Stage Mapping]
- Dropdown to select "Funded Investor Pipeline"
- Multi-select for "Committed Stages" (maps to commitments)
- Multi-select for "Funded Stages" (maps to funded investors)
```

#### 3.3 Sync Health Indicator

Add a sync status badge in the integrations tab:
- Green "Synced X minutes ago" if healthy
- Yellow "Stale (X hours ago)" if > 2 hours
- Red "Sync Error: {message}" if failed

---

### Phase 4: Hourly Sync Cron Job Enhancement

#### 4.1 Update existing `pg_cron` job

Modify the hourly sync cron to:
1. Fetch all clients with GHL credentials configured
2. For each client, call sync function with `mode: 'full'`
3. Update `clients.last_ghl_sync_at` and `ghl_sync_status`
4. Capture any errors in `ghl_sync_error`

#### 4.2 Daily Health Check Job

Add a daily cron job (runs at 6 AM) that:
1. For each client, performs a quick API validation
2. Marks clients as 'error' if credentials are invalid (401/403)
3. Creates a data discrepancy record if sync hasn't run in 24 hours

---

### Phase 5: Client Table Visual Indicator

#### 5.1 Update `DraggableClientTable.tsx`

Add visual sync status indicator:
- If `ghl_sync_status === 'error'` or `ghl_sync_status === 'not_configured'`: Apply `border-2 border-destructive` to the row
- If `ghl_sync_status === 'stale'`: Apply `border-2 border-yellow-500` to the row
- Hover tooltip showing last sync time and any error message

#### 5.2 Add Sync Status Column (optional)

Add a "Sync" column showing:
- Green checkmark if healthy
- Yellow clock if stale
- Red X if error
- Gray dash if not configured

---

### Phase 6: Hard Numbers by Day and Stage

#### 6.1 Enhance `daily_metrics` calculation

Ensure all stage counts are derived from actual records:
- `leads`: COUNT of `leads` where `DATE(created_at) = date`
- `calls`: COUNT of `calls` where `DATE(scheduled_at) = date`
- `showed_calls`: COUNT where `showed = true` or `appointment_status = 'showed'`
- `reconnect_calls`: COUNT where `is_reconnect = true`
- `reconnect_showed`: COUNT where `is_reconnect = true AND showed = true`
- `commitments`: COUNT of funded_investors where `commitment_amount > 0` for date
- `funded_investors`: COUNT of funded_investors where `funded_amount > 0` for date

#### 6.2 Add Metrics Refresh Trigger

After each sync, trigger a refresh of daily_metrics for:
- Today's date
- Any dates where appointment statuses changed

---

## Technical Architecture

```text
+----------------+     +-------------------+     +------------------+
|   pg_cron      |---->| sync-ghl-contacts |---->| Leads Table      |
| (hourly)       |     | Edge Function     |---->| Calls Table      |
+----------------+     | - contacts mode   |---->| Funded Investors |
                       | - appointments    |---->| Daily Metrics    |
                       | - full mode       |     +------------------+
                       +-------------------+
                              |
                              v
                       +-------------------+
                       | Clients Table     |
                       | - last_sync_at    |
                       | - sync_status     |
                       | - sync_error      |
                       +-------------------+
                              |
                              v
                       +-------------------+
                       | Client Settings   |
                       | - calendar_ids    |
                       | - pipeline_maps   |
                       +-------------------+
```

---

## Files to Create/Modify

### Database Migration
- Add columns to `client_settings`, `clients`, and `calls` tables
- Add unique constraint on `calls(client_id, ghl_appointment_id)`

### Edge Functions
- `supabase/functions/sync-ghl-contacts/index.ts` - Add appointment sync logic

### React Components
- `src/components/settings/ClientSettingsModal.tsx` - Add calendar/pipeline config UI
- `src/components/settings/CalendarTrackingSection.tsx` (new) - Calendar multi-select
- `src/components/settings/PipelineMappingSection.tsx` (new) - Stage mapping UI
- `src/components/dashboard/DraggableClientTable.tsx` - Add sync status visual

### Hooks
- `src/hooks/useGHLCalendars.ts` (new) - Fetch available calendars from GHL
- `src/hooks/useSyncHealth.ts` - Update to use new sync status fields

---

## Summary of Tracked Stages

| Stage | Source | Tracking Method |
|-------|--------|-----------------|
| New Contacts | GHL Contacts API | Hourly sync via API |
| Booked Calls | GHL Calendars API | By calendar ID config |
| Showed | GHL Appointment Status | `status = 'showed'` |
| No Show | GHL Appointment Status | `status = 'no_showed'` |
| Cancelled | GHL Appointment Status | `status = 'cancelled'` |
| Rescheduled | GHL Appointment Status | `status = 'rescheduled'` |
| Reconnect Call | GHL Calendars API | By reconnect calendar config |
| Committed | GHL Opportunities API | By stage ID mapping |
| Funded | GHL Opportunities API | By stage ID mapping + tags |

---

## Client Sync Health Visual Indicator

Clients without working GHL integration will be highlighted:
- **Red border**: API credentials missing, invalid, or sync failed
- **Yellow border**: Sync is stale (>24 hours since last successful sync)
- **Normal border**: Healthy sync within last 2 hours

This provides immediate visibility into which clients need attention.



ALSO NEED TO REMOVE ALL WEBHOOK DATA FOR NOW AND FREEZE WEBHOOKS UNTIL FURTHER NOTICE 

