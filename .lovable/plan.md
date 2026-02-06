
# Re-engineer Performance Summary Table

## Overview

Transform the Monthly/Weekly/Daily Performance Summary table from a **period-per-row** layout to a **transposed layout** where:
- **Time periods appear as columns** across the top (TOTAL, Feb 2026, Jan 2026, etc.)
- **Metrics appear as rows** down the left side (Ad Spend, Leads, CPL, Calls, etc.)

This eliminates the need for horizontal scrolling since there are typically only 2-12 periods to display but 19+ metrics.

## Current vs New Layout

**Current Layout (causes horizontal scrolling):**
```text
| Month      | Ad Spend | Leads | CPL   | Calls | $/Call | Showed | ... (19 columns) |
|------------|----------|-------|-------|-------|--------|--------|------------------|
| TOTAL      | $0       | 972   | $0.00 | 184   | $0.00  | 110    | ...              |
| Feb 2026   | $0       | 138   | $0.00 | 1     | $0.00  | 1      | ...              |
| Jan 2026   | $0       | 834   | $0.00 | 183   | $0.00  | 109    | ...              |
```

**New Transposed Layout (vertical scrolling, no horizontal):**
```text
| Metric     | TOTAL  | Feb 2026 | Jan 2026 |
|------------|--------|----------|----------|
| Ad Spend   | $0     | $0       | $0       |
| Leads      | 972    | 138      | 834      |
| CPL        | $0.00  | $0.00    | $0.00    |
| Calls      | 184    | 1        | 183      |
| $/Call     | $0.00  | $0.00    | $0.00    |
| Showed     | 110    | 1        | 109      |
| Show %     | 59.8%  | 100%     | 59.6%    |
| $/Show     | $0.00  | $0.00    | $0.00    |
| ...        | ...    | ...      | ...      |
```

## Implementation Changes

### 1. Define Metric Row Configuration

Create a structured array defining each metric row with:
- Display label
- Field key for data access
- Formatting function (currency, percentage, number)
- Whether it's editable

```typescript
const METRIC_ROWS = [
  { label: 'Ad Spend', key: 'adSpend', format: 'currency', editable: true },
  { label: 'Leads', key: 'leads', format: 'number', editable: true },
  { label: 'CPL', key: 'cpl', format: 'currency', editable: false },
  { label: 'Calls', key: 'calls', format: 'number', editable: true },
  { label: '$/Call', key: 'costPerCall', format: 'currency', editable: false },
  // ... etc
];
```

### 2. Transpose Table Structure

Transform the `<Table>` component:
- **Header row**: Metric label + one column per period (TOTAL first, then periods)
- **Body rows**: One row per metric, with values from each period

### 3. Update Editable Cell Logic

Adapt `renderEditableCell` to work in transposed context:
- Pencil icon appears on hover for editable metric cells
- Inline editing works the same way but positioned in transposed cell

### 4. Styling Adjustments

- **First column (Metric)**: Left-aligned, bold, sticky if needed
- **TOTAL column**: Highlighted with `bg-muted/50` background
- **Data columns**: Right-aligned, monospace font
- Remove `overflow-x-auto` wrapper since horizontal scrolling is eliminated

### 5. Mobile Responsiveness

For very narrow screens (< 640px):
- Consider limiting visible periods to last 3
- Or keep current horizontal layout for daily view (many periods)

## Visual Preview

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Monthly Performance Summary                    [2026 ▼] [M] [W] [D] │
│ Aggregated metrics by month for 2026                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Metric          │  TOTAL   │ Feb 2026 │ Jan 2026                   │
│  ─────────────────────────────────────────────────                  │
│  Ad Spend        │  $0      │  $0      │  $0                        │
│  Leads           │  972     │  138     │  834                       │
│  CPL             │  $0.00   │  $0.00   │  $0.00                     │
│  Calls           │  184     │  1       │  183                       │
│  $/Call          │  $0.00   │  $0.00   │  $0.00                     │
│  Showed          │  110     │  1       │  109                       │
│  Show %          │  59.8%   │  100%    │  59.6%                     │
│  $/Show          │  $0.00   │  $0.00   │  $0.00                     │
│  Reconnect       │  14      │  0       │  14                        │
│  $/Recon         │  $0.00   │  $0.00   │  $0.00                     │
│  Recon Showed    │  ...     │  ...     │  ...                       │
│  $/R.Showed      │  ...     │  ...     │  ...                       │
│  Commitments     │  ...     │  ...     │  ...                       │
│  Commit $        │  ...     │  ...     │  ...                       │
│  Funded #        │  ...     │  ...     │  ...                       │
│  Funded $        │  ...     │  ...     │  ...                       │
│  CPA             │  ...     │  ...     │  ...                       │
│  CoC %           │  ...     │  ...     │  ...                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Technical Details

### Files Modified
- `src/components/dashboard/PeriodicStatsTable.tsx` - Complete table restructure

### Key Code Structure

```typescript
// Metric row definitions
const METRIC_ROWS = [
  { label: 'Ad Spend', key: 'adSpend', format: (v) => `$${v.toLocaleString()}`, editable: true, dbField: 'ad_spend' },
  { label: 'Leads', key: 'leads', format: (v) => v.toLocaleString(), editable: true, dbField: 'leads' },
  { label: 'CPL', key: 'cpl', format: (v) => `$${v.toFixed(2)}`, editable: false },
  // ... 16 more metrics
];

// Table structure
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Metric</TableHead>
      <TableHead className="bg-muted/50">TOTAL</TableHead>
      {displayStats.map(period => (
        <TableHead key={period.period}>{period.periodLabel}</TableHead>
      ))}
    </TableRow>
  </TableHeader>
  <TableBody>
    {METRIC_ROWS.map(metric => (
      <TableRow key={metric.key}>
        <TableCell className="font-medium">{metric.label}</TableCell>
        <TableCell className="bg-muted/50 font-semibold">
          {metric.format(totals[metric.key])}
        </TableCell>
        {displayStats.map(period => (
          <TableCell key={period.period}>
            {metric.editable 
              ? renderEditableCell(period, metric.key, period[metric.key], metric.format)
              : metric.format(period[metric.key])
            }
          </TableCell>
        ))}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Preserving Features
- Inline editing with pencil icon on hover (editable metrics only)
- Year selector and period type toggle (Monthly/Weekly/Daily)
- "Add missing month" functionality
- TOTAL column with highlighted background
- Funded $ row highlighted in green color

## Benefits

1. **No horizontal scrolling** - All data visible without scrolling left/right
2. **Better readability** - Metrics stack vertically in natural reading order
3. **Easier comparison** - Compare same metric across periods horizontally
4. **Scales better** - Works with 2 periods or 12 periods without layout changes
