

# Ad-Level Attribution + Hyros-Style Meta Ads Overlay

## Overview

This plan adds **ad-level CRM attribution** to the Ads Manager so every individual ad shows Leads, Calls, Showed, Funded, and CPA -- completing the full-funnel Hyros alternative at all three levels (Campaign > Ad Set > Ad).

Regarding the **Chrome Extension**: Lovable builds web applications, not browser extensions. However, I can build an equivalent **embeddable overlay page** that you can open side-by-side with Meta Ads Manager, or even bookmark as a quick-access panel. It will show real-time CRM attribution (calls, funded investors) mapped to your Meta ad account structure.

---

## Part 1: Ad-Level Attribution in Sync Function

**Problem**: The `attributeCRMData` function currently only attributes leads/calls/funded at the campaign and ad set level. The `meta_ads` table already has attribution columns but they're never populated.

**Solution**: Extend the attribution logic to match leads to specific ads using a two-pass approach:

1. **Direct match**: If leads have an `ad_id` field populated (from UTM parameters or GHL custom fields), match directly to `meta_ads.meta_ad_id`
2. **Name-based match**: Since ad set names in GHL often embed the ad creative name (e.g., ad set "Static-Ad-6 | Broad | iOS Users" contains ad name "Static-Ad-6"), use fuzzy/substring matching to attribute leads to the most likely ad within that ad set

**File**: `supabase/functions/sync-meta-ads/index.ts`
- Add ad-level stats aggregation map (similar to existing campaign/adSet maps)
- For each lead, attempt to match to a specific ad by:
  - Checking if `ad_set_name` contains any ad name from that ad set
  - Using the ad with the best substring match
- Update `meta_ads` rows with attribution counts and cost metrics

## Part 2: Full Attribution Columns in Ads Table UI

**Problem**: The Ads tab currently only shows Spend, Impressions, CPM, Clicks, CTR, CPC -- missing all CRM attribution columns.

**Solution**: Add the full METRIC_HEADERS (Leads, CPL, Calls, Showed, Funded, Funded $, CPA) to the Ads table, matching the Campaign and Ad Set tables.

**File**: `src/components/ads-manager/AdsManagerTab.tsx`
- Replace the hardcoded 7 metric columns in AdsTable with the shared `METRIC_HEADERS` and `MetricCells` component (already used by campaigns/ad sets)
- Keep the creative thumbnail preview in the first column

## Part 3: Meta Ads Overlay Page (Chrome Extension Alternative)

Build a standalone route `/meta-overlay` that provides a compact, always-on-top-style view of CRM attribution data organized by Meta ad structure. This can be opened in a separate browser window alongside the actual Meta Ads Manager.

**New file**: `src/pages/MetaAdsOverlay.tsx`
- Compact, dark-themed panel designed to sit beside Meta Ads Manager
- Client selector dropdown at top
- Shows campaigns with expandable ad sets and ads
- Each row shows: Leads, Calls, Showed, Funded, Funded $, CPA
- Auto-refreshes every 60 seconds
- Color-coded performance indicators (green/yellow/red based on CPA thresholds)
- Copy-to-clipboard for any metric value
- Searchable by campaign/ad set/ad name so you can quickly find the row matching what you're looking at in Meta

**Route**: Add `/meta-overlay` to `App.tsx` (public, no password gate)

---

## Technical Details

### Sync Function Changes (`sync-meta-ads/index.ts`)

```text
attributeCRMData() additions:
  1. Fetch all meta_ads for client (id, name, ad_set_id, spend)
  2. Build ad-name-to-ad-set mapping
  3. For each lead with ad_set_name:
     - Find matching meta_ad_set by name
     - Find best-matching meta_ad within that set (substring match on ad name)
     - Aggregate stats into adStats map
  4. Update meta_ads rows with attribution data
```

### UI Changes (`AdsManagerTab.tsx`)

- AdsTable: Replace individual SortableTableHeader columns with `METRIC_HEADERS.map(...)` loop
- AdsTable: Replace individual TableCells with `<MetricCells row={a} />`
- Keeps creative thumbnail + preview modal intact

### Overlay Page (`MetaAdsOverlay.tsx`)

- Uses existing hooks: `useClients`, `useMetaCampaigns`, `useMetaAdSets`, `useMetaAds`
- Minimal UI with `refetchInterval: 60000` for auto-refresh
- Expandable tree: Campaign > Ad Set > Ad with attribution metrics inline
- No sidebar/header chrome -- just the data panel

### Route Registration (`App.tsx`)

- Add `/meta-overlay` as a public route (no PasswordGate)

---

## Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/functions/sync-meta-ads/index.ts` | Edit -- add ad-level attribution |
| `src/components/ads-manager/AdsManagerTab.tsx` | Edit -- full metrics in Ads tab |
| `src/pages/MetaAdsOverlay.tsx` | Create -- compact overlay page |
| `src/App.tsx` | Edit -- add overlay route |

