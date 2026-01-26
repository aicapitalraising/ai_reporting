
# Plan: Attribution Dashboard as Dedicated Tab with Conversion Rates and Date Filter

## Summary

This plan moves the Attribution Dashboard from the Overview section to its own dedicated tab. It adds conversion rate metrics and an independent date range filter that dynamically updates the attribution data.

---

## 1. Move Attribution to Its Own Tab

### Current Location
- Embedded within Overview section (after PeriodicStatsTable)

### New Location
- Dedicated "Attribution" tab button in the main navigation
- Positioned after "Overview" and before "Detailed Records"

### Files to Update
| File | Changes |
|------|---------|
| `ClientDetail.tsx` | Add new tab button, new tab content section, remove from Overview |
| `PublicReport.tsx` | Same changes for public view consistency |

---

## 2. Add Conversion Rate Metrics

New columns in the table and additional chart metrics:

| Metric | Calculation | Display |
|--------|-------------|---------|
| Lead → Booked % | (Booked Calls / Leads) × 100 | e.g., "62.2%" |
| Booked → Showed % | (Showed Calls / Booked Calls) × 100 | e.g., "78.6%" |
| Showed → Funded % | (Funded / Showed Calls) × 100 | e.g., "36.4%" |
| Lead → Funded % | (Funded / Leads) × 100 | e.g., "17.8%" |

### Table Structure Update

```text
| Campaign | Leads | Booked | L→B % | Showed | B→S % | Funded | S→F % | L→F % |
|----------|-------|--------|-------|--------|-------|--------|-------|-------|
| Camp A   | 45    | 28     | 62.2% | 22     | 78.6% | 8      | 36.4% | 17.8% |
```

### Visual Indicators
- Color-coded percentages (green for good, yellow for okay, red for poor)
- Thresholds to be determined (or use sensible defaults like >50% = green)

---

## 3. Add Independent Date Range Filter

The Attribution Dashboard will have its own date range controls that filter the leads, calls, and funded investors data specifically for attribution analysis.

### Implementation Approach

**Option A (Recommended): Local Date State**
- Add local `useState` for date range within `AttributionDashboard` component
- Pass all raw (unfiltered) data to the component
- Filter locally based on selected date range
- This allows attribution to be analyzed independently of the global filter

### Date Filter Controls
- Preset dropdown (Last 7, 14, 30, 90 days, MTD, YTD, All Time)
- Calendar picker for custom range
- Positioned in the card header alongside the Campaign/Ad Set/Ads toggle

### Data Considerations
- `leads.created_at` - filter leads by date
- `calls.created_at` - filter calls by date
- `fundedInvestors.funded_at` - filter funded by date

---

## Technical Implementation

### Modified Component: `AttributionDashboard.tsx`

**New Props:**
```typescript
interface AttributionDashboardProps {
  leads: Lead[];
  calls: Call[];
  fundedInvestors: FundedInvestor[];
}
// Props remain the same - filtering will happen internally
```

**New State:**
```typescript
const [localDateRange, setLocalDateRange] = useState({ from: thirtyDaysAgo, to: today });
```

**New Calculated Fields in `AttributionData`:**
```typescript
interface AttributionData {
  name: string;
  leads: number;
  bookedCalls: number;
  showedCalls: number;
  fundedInvestors: number;
  // New conversion rate fields
  leadToBookedRate: number;
  bookedToShowedRate: number;
  showedToFundedRate: number;
  leadToFundedRate: number;
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/AttributionDashboard.tsx` | Add date filter, conversion rate calculations, expanded table columns |
| `src/pages/ClientDetail.tsx` | Move AttributionDashboard to its own tab, remove from Overview |
| `src/pages/PublicReport.tsx` | Same tab changes for public view |

---

## Implementation Order

1. **Update AttributionDashboard component**
   - Add local date range state and filter controls
   - Add conversion rate calculations to aggregation logic
   - Expand table with conversion rate columns
   - Add color coding for conversion percentages

2. **Update ClientDetail.tsx**
   - Add "Attribution" button to tab navigation
   - Add `{activeTab === 'attribution' && ...}` section
   - Remove AttributionDashboard from Overview section

3. **Update PublicReport.tsx**
   - Mirror the same tab changes for consistency

---

## Visual Preview

**Tab Navigation:**
```text
[Overview] [Attribution] [Detailed Records] [Tasks] [+ Add Tab]
```

**Attribution Dashboard Layout:**
```text
┌─────────────────────────────────────────────────────────────────────┐
│ Attribution Dashboard                                                │
│                                                                      │
│ Date Range: [Last 30 Days ▼] [Jan 1 - Jan 26 📅]                    │
│ View: [Campaigns] [Ad Sets] [Ads]                                   │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                     [Horizontal Bar Chart]                      │ │
│ │  Campaign A  ████████████████████ 45 leads                     │ │
│ │  Campaign B  ████████████ 28 leads                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Campaign │ Leads│Booked│L→B% │Showed│B→S% │Funded│S→F% │L→F%  ││
│ │──────────│──────│──────│─────│──────│─────│──────│─────│──────││
│ │ Camp A   │ 45   │ 28   │62.2%│ 22   │78.6%│ 8    │36.4%│17.8% ││
│ │ Camp B   │ 32   │ 18   │56.3%│ 14   │77.8%│ 5    │35.7%│15.6% ││
│ └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```
