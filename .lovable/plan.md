

# Source Filter & Auto-UTM Mapping Implementation

## Overview

This plan implements three key features:
1. **Global Source Filter** - Filter all data by advertising platform (Facebook, Google, etc.) based on UTM parameters
2. **Filtered CPL & Cost Calculations** - Show true cost-per-lead and other costs filtered by source
3. **Auto UTM Mapping** - Automatically map Facebook/Google campaign data to the standardized UTM hierarchy

---

## Current State Analysis

### How UTM Data is Currently Stored

From reviewing the codebase:
- **`leads` table** has: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `campaign_name`, `ad_set_name`, `ad_id`
- **webhook-ingest** extracts these from GHL payloads using multiple fallback paths
- **sync-ghl-contacts** maps GHL Page Details fields to these columns
- The Attribution Dashboard already has a `sourceFilter` state but it only filters within that component, not globally

### Current UTM Mapping Logic

The webhook already maps:
- `Utm Campaign` → `campaign_name` and `utm_campaign`
- `Utm Medium` / `Adset Id` → `ad_set_name`
- `Utm Content` / `Ad Id` → `ad_id`

However, the `utm_source` field is often not correctly populated with the platform name (Facebook, Google, etc.)

---

## Implementation Plan

### Part 1: Auto-Detection of Advertising Source

Add logic to both webhook-ingest and sync-ghl-contacts to auto-detect the source platform:

```text
Detection Rules:
- If utm_source contains "facebook", "fb", "meta", "instagram" → normalize to "Facebook"
- If utm_source contains "google", "gclid" → normalize to "Google"
- If utm_source contains "tiktok" → normalize to "TikTok"
- If utm_source contains "linkedin" → normalize to "LinkedIn"
- If campaign_name suggests Facebook (common patterns) → set utm_source = "Facebook"
- If no source detected but has Facebook-style campaign data → default to "Facebook"
```

### Part 2: Global Source Filter Context

Extend the existing DateFilterContext to include source filtering:

**File: `src/contexts/DateFilterContext.tsx`**

Add:
```typescript
interface DateFilterContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  startDate: string;
  endDate: string;
  // NEW: Source filtering
  sourceFilter: string[];
  setSourceFilter: (sources: string[]) => void;
  availableSources: string[];
  setAvailableSources: (sources: string[]) => void;
}
```

### Part 3: Update DateRangeFilter Component

**File: `src/components/dashboard/DateRangeFilter.tsx`**

Add a Source dropdown filter using the existing FilterDropdown pattern from Attribution Dashboard:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Filters & Actions                                                           │
│ Select date range and export data                                           │
│                                                                             │
│ [Yesterday ▼] [📅 Jan 29, 2026 - Jan 29, 2026] [Source ▼ Facebook] [🔄] [📥]│
│                                                                             │
│ Active: [Facebook ×]                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

Features:
- Multi-select source dropdown with search
- Chips showing active source filters
- Quick clear button

### Part 4: Source-Filtered Metrics Hook

Create a new hook that provides source-filtered leads data:

**File: `src/hooks/useSourceFilteredMetrics.ts`**

```typescript
export function useSourceFilteredMetrics(clientId?: string) {
  const { startDate, endDate, sourceFilter } = useDateFilter();
  const { data: leads } = useLeads(clientId, startDate, endDate);
  
  // Filter leads by source
  const filteredLeads = useMemo(() => {
    if (sourceFilter.length === 0) return leads;
    return leads.filter(lead => 
      sourceFilter.some(source => 
        normalizeSource(lead.utm_source) === source
      )
    );
  }, [leads, sourceFilter]);
  
  // Calculate filtered metrics
  const metrics = useMemo(() => ({
    leads: filteredLeads.length,
    // ... other metrics calculated from filtered data
  }), [filteredLeads]);
  
  return { filteredLeads, metrics, totalLeads: leads?.length || 0 };
}
```

### Part 5: Update Webhook Ingest for Source Normalization

**File: `supabase/functions/webhook-ingest/index.ts`**

Add source normalization function:

```typescript
function normalizeSource(rawSource: string | null | undefined): string {
  if (!rawSource) return 'Unknown';
  const lower = rawSource.toLowerCase();
  
  // Facebook/Meta detection
  if (lower.includes('facebook') || lower.includes('fb') || 
      lower.includes('meta') || lower.includes('instagram') ||
      lower.includes('ig_')) {
    return 'Facebook';
  }
  
  // Google detection
  if (lower.includes('google') || lower.includes('gclid') ||
      lower.includes('youtube') || lower.includes('yt_')) {
    return 'Google';
  }
  
  // TikTok detection
  if (lower.includes('tiktok') || lower.includes('tt_')) {
    return 'TikTok';
  }
  
  // LinkedIn detection
  if (lower.includes('linkedin') || lower.includes('li_')) {
    return 'LinkedIn';
  }
  
  // Common CRM sources
  if (lower === 'webhook' || lower === 'manual' || lower === 'api') {
    return 'Direct';
  }
  
  return rawSource; // Keep original if no match
}
```

Also infer source from campaign patterns:
- If `campaign_name` contains Facebook-style IDs (numeric IDs) → Facebook
- If payload contains `adCampaign`, `adSet` → likely Facebook

### Part 6: Update GHL Sync for Source Normalization

**File: `supabase/functions/sync-ghl-contacts/index.ts`**

Apply the same normalization logic when syncing contacts.

### Part 7: Update KPI Calculations

**File: `src/pages/Index.tsx`** and **`src/pages/ClientDetail.tsx`**

Update to use source-filtered metrics when calculating CPL, CPA, etc.:

```typescript
// When source filter is active, recalculate metrics
const filteredMetrics = useMemo(() => {
  if (sourceFilter.length === 0) return aggregatedMetrics;
  
  // Filter leads by source
  const sourceLeads = allLeads.filter(l => 
    sourceFilter.includes(normalizeSource(l.utm_source))
  );
  
  // Recalculate CPL with filtered leads but same ad spend
  return {
    ...aggregatedMetrics,
    totalLeads: sourceLeads.length,
    costPerLead: sourceLeads.length > 0 
      ? aggregatedMetrics.totalAdSpend / sourceLeads.length 
      : 0,
    // ... other filtered calculations
  };
}, [aggregatedMetrics, allLeads, sourceFilter]);
```

### Part 8: Update Attribution Dashboard

**File: `src/components/dashboard/AttributionDashboard.tsx`**

Connect to the global source filter context so that filtering in the main dashboard propagates down.

---

## UTM Parameter Mapping Reference

| Facebook Ad Data | UTM Field | Database Column |
|------------------|-----------|-----------------|
| Campaign Name | utm_campaign | `campaign_name` |
| Ad Set Name | utm_medium | `ad_set_name` |
| Ad Name | utm_content | `ad_id` |
| Platform | utm_source | `utm_source` |

This aligns with the industry standard:
- **Source** = Platform (Facebook, Google)
- **Campaign** = Campaign Name
- **Medium** = Ad Set / Ad Group
- **Content** = Ad Name / Creative

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/contexts/DateFilterContext.tsx` | Modify | Add sourceFilter state and setters |
| `src/components/dashboard/DateRangeFilter.tsx` | Modify | Add Source multi-select dropdown with chips |
| `src/hooks/useSourceFilteredMetrics.ts` | Create | Hook for source-filtered lead/metric calculations |
| `supabase/functions/webhook-ingest/index.ts` | Modify | Add `normalizeSource()` function and apply to utm_source |
| `supabase/functions/sync-ghl-contacts/index.ts` | Modify | Add same source normalization logic |
| `src/pages/Index.tsx` | Modify | Use source-filtered metrics for KPI display |
| `src/pages/ClientDetail.tsx` | Modify | Apply source filter to client metrics |
| `src/components/dashboard/AttributionDashboard.tsx` | Modify | Connect to global source filter context |
| `src/lib/sourceUtils.ts` | Create | Shared utility functions for source normalization |

---

## Technical Details

### Source Normalization Utility

```typescript
// src/lib/sourceUtils.ts
export const KNOWN_SOURCES = ['Facebook', 'Google', 'TikTok', 'LinkedIn', 'Direct', 'Unknown'];

export function normalizeSource(raw: string | null | undefined): string {
  if (!raw) return 'Unknown';
  const lower = raw.toLowerCase().trim();
  
  // Platform detection patterns
  const patterns: [RegExp, string][] = [
    [/facebook|fb|meta|instagram|ig_/i, 'Facebook'],
    [/google|gclid|youtube|yt_/i, 'Google'],
    [/tiktok|tt_|bytedance/i, 'TikTok'],
    [/linkedin|li_/i, 'LinkedIn'],
    [/^(webhook|manual|api|direct)$/i, 'Direct'],
  ];
  
  for (const [pattern, source] of patterns) {
    if (pattern.test(lower)) return source;
  }
  
  return raw; // Keep original capitalization if no match
}
```

### Filter Propagation Flow

```text
DateFilterContext
    ↓
sourceFilter state
    ↓
┌─────────────────────────────────┐
│ DateRangeFilter (UI)            │
│ - Source dropdown               │
│ - Active filter chips           │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ useSourceFilteredMetrics hook   │
│ - Filters leads by source       │
│ - Recalculates CPL, CPA, etc.   │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ KPIGrid, ClientTable            │
│ - Shows filtered metrics        │
│ - True CPL for selected sources │
└─────────────────────────────────┘
```

---

## Expected Result

After implementation:
1. **Global Source Dropdown** in the Filters section allowing multi-select of Facebook, Google, etc.
2. **True CPL/CPA Calculations** - When filtering by Facebook, shows cost-per-lead only counting Facebook leads
3. **Automatic Source Detection** - Webhooks and API syncs auto-populate utm_source based on campaign patterns
4. **Consistent Mapping** - UTM parameters standardized: Campaign → Campaign Name, Medium → Ad Set, Content → Ad Name
5. **Cross-Client Visibility** - Source filter applies across all clients on agency dashboard

