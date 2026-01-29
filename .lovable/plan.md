

# Plan: Enhanced Pixel & Conversion Event Verification System

## Overview
Enhance the existing pixel verification system to detect conversion events across all platforms (Meta, Google, LinkedIn, TikTok), support custom conversion tracking, and provide automated verification capabilities. This will give visibility into which events are firing on each funnel step and enable scheduled monitoring.

## Current State
- **Manual verification only** - users must click "Pixels" button per step
- **Basic event detection** - currently detects PageView, Lead, Schedule, etc. but not custom conversions
- **No history** - scan results are not persisted to database
- **No configuration** - no way to define which events *should* be present per step

---

## Proposed Changes

### 1. Database Schema

**New Table: `pixel_verifications`** - stores scan results history
```
- id (uuid)
- step_id (uuid, FK to client_funnel_steps)
- client_id (uuid, FK to clients)
- scanned_at (timestamp)
- results (jsonb) - full scan data
- status ('pass' | 'warning' | 'fail')
- events_detected (text[]) - array of event names found
- missing_expected (text[]) - events expected but not found
```

**New Table: `pixel_expected_events`** - defines what events should fire per step
```
- id (uuid)
- step_id (uuid, FK to client_funnel_steps)
- platform ('meta' | 'google' | 'linkedin' | 'tiktok')
- event_name (text) - e.g., 'Lead', 'Schedule', 'CustomEventName'
- is_custom (boolean)
- created_at (timestamp)
```

**Alter `client_settings`** - add automated verification config
```
- pixel_verification_enabled (boolean)
- pixel_verification_frequency ('daily' | 'weekly' | 'manual')
- pixel_notification_email (text)
```

### 2. Edge Function Enhancements (`verify-pixels`)

Expand detection patterns to include:

**Meta Custom Events:**
- Detect `fbq('trackCustom', 'EventName')` and extract the custom event name
- Pattern: `/fbq\s*\(\s*['"]trackCustom['"]\s*,\s*['"]([^'"]+)['"]/gi`

**Google Enhanced Conversions:**
- Detect all `gtag('event', 'event_name')` patterns
- Extract custom event names dynamically
- Pattern: `/gtag\s*\(\s*['"]event['"]\s*,\s*['"]([^'"]+)['"]/gi`

**LinkedIn Conversion Events:**
- Detect `lintrk('track', { conversion_id: X })`
- Pattern: `/lintrk\s*\(\s*['"]track['"]\s*,\s*\{[^}]*conversion_id[^}]*\}/gi`

**TikTok Custom Events:**
- Detect all `ttq.track('EventName')` patterns
- Pattern: `/ttq\.track\s*\(\s*['"]([^'"]+)['"]/gi`

**New Response Structure:**
```json
{
  "success": true,
  "pixels": [...],
  "allEvents": [
    { "platform": "meta", "event": "PageView", "type": "standard" },
    { "platform": "meta", "event": "ScheduleAppointment", "type": "custom" },
    { "platform": "google", "event": "conversion", "conversionId": "AW-123/abc" }
  ],
  "rawMatches": { ... },
  "scannedAt": "..."
}
```

### 3. New Edge Function: `verify-all-pixels`

Batch verification for a client's entire funnel:
- Accepts `client_id` parameter
- Fetches all funnel steps + variants for the client
- Scans each URL in parallel (with rate limiting)
- Compares detected events against expected events
- Stores results in `pixel_verifications` table
- Returns summary with pass/fail status per step

### 4. UI Components

**Enhanced `PixelVerificationModal`:**
- Add "Events" tab showing all detected events (standard + custom)
- Add "Expected Events" configuration section
- Show pass/fail status based on expected vs detected
- Display scan history from database

**New `ExpectedEventsConfig` Component:**
- Per-step configuration of which events should fire
- Autocomplete for standard events
- Ability to add custom event names
- Platform selector

**Enhanced `FunnelStepCard`:**
- Show verification status badge (green checkmark / yellow warning / red X)
- Last scan timestamp
- Quick hover preview of detected events

**New `FunnelPixelAudit` Component:**
- Full-page audit view accessible from funnel header
- "Scan All Steps" button for batch verification
- Summary table showing all steps with their verification status
- Filter by status (pass/warning/fail)
- Export report functionality

**Client Settings Enhancement:**
- New "Pixel Verification" section in settings
- Toggle for automated daily/weekly scans
- Email notification settings

### 5. Automated Verification (Phase 2)

**Scheduled Verification Edge Function:**
- Cron-triggered function to run daily/weekly
- Scans all clients with `pixel_verification_enabled = true`
- Sends email notifications for failures
- Could leverage Supabase's pg_cron or external scheduler

---

## Technical Details

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_pixel_verification_tables.sql` | Create | New tables for verification history and expected events |
| `supabase/functions/verify-pixels/index.ts` | Modify | Enhanced event detection patterns, persist results |
| `supabase/functions/verify-all-pixels/index.ts` | Create | Batch verification for entire funnel |
| `src/hooks/usePixelVerification.ts` | Create | Query/mutation hooks for verification data |
| `src/hooks/useExpectedEvents.ts` | Create | CRUD hooks for expected events configuration |
| `src/components/funnel/PixelVerificationModal.tsx` | Modify | Enhanced UI with events tab, history, and expected config |
| `src/components/funnel/ExpectedEventsConfig.tsx` | Create | Per-step event configuration component |
| `src/components/funnel/FunnelPixelAudit.tsx` | Create | Full audit view with batch scanning |
| `src/components/funnel/FunnelStepCard.tsx` | Modify | Add verification status badge |
| `src/components/funnel/FunnelPreviewTab.tsx` | Modify | Add "Audit Pixels" button to header |
| `src/components/settings/ClientSettingsModal.tsx` | Modify | Add pixel verification settings tab |

### Event Detection Patterns (Comprehensive)

```text
Meta Standard Events:
- PageView, Lead, Schedule, CompleteRegistration, Purchase
- ViewContent, InitiateCheckout, AddToCart, AddPaymentInfo
- Contact, FindLocation, CustomizeProduct, Donate

Google Standard Events:
- page_view, conversion, generate_lead, purchase, sign_up
- add_to_cart, begin_checkout, view_item, search

LinkedIn Events:
- Page loads (Insight Tag), Conversion tracking

TikTok Standard Events:
- PageView, ViewContent, ClickButton, SubmitForm
- CompleteRegistration, PlaceAnOrder, Contact
```

### UI Flow

1. **Manual Verification (existing + enhanced):**
   - Click "Pixels" on step card
   - Modal shows detected pixels with all events
   - User can configure expected events
   - Status shows pass/fail based on expected events

2. **Batch Verification:**
   - Click "Audit Pixels" button in funnel header
   - Full-page view loads with all steps
   - Click "Scan All" to verify entire funnel
   - Results stored in database
   - Shows summary with actionable items

3. **Automated Verification (optional):**
   - Enable in Client Settings
   - System scans daily/weekly
   - Email notification on failures

---

## Implementation Order

1. Database migrations (new tables)
2. Enhanced `verify-pixels` edge function with comprehensive patterns
3. New `usePixelVerification` and `useExpectedEvents` hooks
4. Updated `PixelVerificationModal` with events display
5. New `ExpectedEventsConfig` component
6. Status badges on `FunnelStepCard`
7. New `FunnelPixelAudit` batch verification view
8. Client settings for automation config
9. Batch verification edge function (`verify-all-pixels`)
10. (Future) Scheduled automated verification

