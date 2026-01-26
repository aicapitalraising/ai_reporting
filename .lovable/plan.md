
# Plan: Fix Date Filtering Accuracy, Detailed Records Display, and Refresh Functionality

## Summary

This plan addresses three interconnected issues to ensure detailed records (Leads, Calls, Ad Spend, Funded Investors) accurately respond to date filters and the refresh button works properly across the entire application.

---

## Issues Identified

### Issue 1: Date Filtering Timezone Bug
**Location**: `src/contexts/DateFilterContext.tsx`

**Problem**: The context uses `toISOString().split('T')[0]` to format dates, which converts to UTC first. This causes off-by-one day errors depending on the user's timezone.

**Example**:
- User in EST (UTC-5) at 11 PM on January 25th
- `toISOString()` converts to January 26th UTC
- Records for January 25th are missed

**Solution**: Use local date formatting methods instead of ISO string conversion.

---

### Issue 2: Ad Spend "Click to View" Not Working on Agency Dashboard
**Location**: `src/components/drilldown/AdSpendDrillDownModal.tsx`

**Problem**: On the agency dashboard (`/`), the `AdSpendDrillDownModal` is called without a `clientId`. The modal uses `useDailyMetrics(clientId, ...)` which returns an empty array when `clientId` is undefined because:
- The query function returns `[]` immediately if `!clientId`
- The query is disabled with `enabled: !!clientId`

**Solution**: Update the modal to conditionally use `useAllDailyMetrics` when no `clientId` is provided (agency-wide view).

---

### Issue 3: Refresh Button Missing Query Invalidations
**Location**: `src/pages/Index.tsx` and `src/pages/ClientDetail.tsx`

**Problem**: The refresh button only invalidates some query keys, potentially missing data like leads and calls on the agency dashboard.

**Solution**: Ensure all relevant query keys are invalidated when refresh is clicked.

---

## Technical Implementation

### File 1: `src/contexts/DateFilterContext.tsx`

**Change**: Replace ISO string date formatting with local date methods.

```typescript
// Current (problematic):
const startDate = useMemo(() => {
  return dateRange.from.toISOString().split('T')[0];
}, [dateRange.from]);

// Fixed:
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startDate = useMemo(() => formatLocalDate(dateRange.from), [dateRange.from]);
const endDate = useMemo(() => formatLocalDate(dateRange.to), [dateRange.to]);
```

---

### File 2: `src/components/drilldown/AdSpendDrillDownModal.tsx`

**Change**: Add conditional hook usage for agency-wide data.

```typescript
// Add import
import { useDailyMetrics, useAllDailyMetrics, DailyMetric } from '@/hooks/useMetrics';

// Replace single hook with conditional usage
const { data: clientMetrics = [], isLoading: clientLoading } = useDailyMetrics(
  clientId, 
  startDate, 
  endDate
);
const { data: allMetrics = [], isLoading: allLoading } = useAllDailyMetrics(
  clientId ? undefined : startDate,  // Only fetch when no clientId
  clientId ? undefined : endDate
);

// Use appropriate data based on context
const metrics = clientId ? clientMetrics : allMetrics;
const isLoading = clientId ? clientLoading : allLoading;
```

---

### File 3: `src/pages/Index.tsx`

**Change**: Enhance refresh function to invalidate additional query keys.

```typescript
const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: ['all-daily-metrics'] });
  queryClient.invalidateQueries({ queryKey: ['funded-investors'] });
  queryClient.invalidateQueries({ queryKey: ['clients'] });
  queryClient.invalidateQueries({ queryKey: ['all-client-settings'] });
  // Add these for complete refresh
  queryClient.invalidateQueries({ queryKey: ['leads'] });
  queryClient.invalidateQueries({ queryKey: ['calls'] });
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/DateFilterContext.tsx` | Fix timezone-safe date formatting |
| `src/components/drilldown/AdSpendDrillDownModal.tsx` | Support agency-wide data display |
| `src/pages/Index.tsx` | Add leads and calls to refresh invalidation |

---

## Testing Checklist

After implementation:

1. **Date Filtering**
   - Select "Yesterday" - verify correct local date appears in queries
   - Select "Last 7 Days" - verify correct date range
   - Change timezone in browser settings and verify consistency

2. **Detailed Records Display**
   - Go to Client Detail page > Detailed Records tab
   - Change date filter > verify Leads, Calls, Ad Spend, Funded tables update
   - Verify pagination works correctly

3. **Click to View on Agency Dashboard**
   - Click on "Total Ad Spend" KPI card
   - Verify modal opens with all client ad spend data
   - Verify date range is displayed correctly

4. **Refresh Button**
   - Click Refresh on agency dashboard
   - Verify all tables and KPIs reload with fresh data
   - Click Refresh on client detail page
   - Verify client-specific data reloads

---

## Implementation Order

1. Fix `DateFilterContext.tsx` - This affects all date-filtered queries globally
2. Fix `AdSpendDrillDownModal.tsx` - Enables agency-wide ad spend viewing
3. Update `Index.tsx` refresh function - Ensures complete data refresh
