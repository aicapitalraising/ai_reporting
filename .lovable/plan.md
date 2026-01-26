

# Plan: Reorganize Detailed Records Tabs and Ensure Data Accuracy

## Summary

Reorganize the Detailed Records tab structure to follow the requested order (Ad Spend > Leads > Booked Calls > Showed Calls > Reconnect Calls > Reconnect Showed > Commitments > Funded Investors) and ensure all data displays accurately based on the filtered date range.

---

## Current State Analysis

### Current Tab Order (in `InlineRecordsView.tsx`)
1. Leads
2. Calls (all booked calls)
3. Showed (showed calls)
4. Ad Spend
5. Funded

### Issues Identified
1. **Tab order** doesn't match the sales funnel flow
2. **Missing tabs**: Reconnect Calls, Reconnect Showed, and Commitments are not separate tabs
3. **Reconnect filtering**: Currently handled via a dropdown filter, not as dedicated tabs
4. **Commitments**: No record-level view exists; data is only in `daily_metrics` aggregates
5. **Booked calls**: Currently labeled as "Calls" - should be renamed

---

## Proposed Solution

### New Tab Order (matches sales funnel)
1. **Ad Spend** - Daily spend metrics
2. **Leads** - All leads
3. **Booked Calls** - Initial (non-reconnect) calls only
4. **Showed Calls** - Showed initial calls only
5. **Reconnect Calls** - Reconnect calls (not showed)
6. **Reconnect Showed** - Reconnect calls that showed
7. **Commitments** - Commitment records from funded_investors
8. **Funded** - Funded investor records

---

## Implementation Details

### File: `src/components/dashboard/InlineRecordsView.tsx`

#### 1. Add New Data Filters

```typescript
// Separate call types into distinct arrays
const initialCalls = useMemo(() => 
  calls.filter(c => !c.is_reconnect), [calls]);

const bookedCalls = useMemo(() => 
  initialCalls, [initialCalls]); // All initial calls = booked

const showedInitialCalls = useMemo(() => 
  initialCalls.filter(c => c.showed), [initialCalls]);

const reconnectCalls = useMemo(() => 
  calls.filter(c => c.is_reconnect && !c.showed), [calls]);

const reconnectShowedCalls = useMemo(() => 
  calls.filter(c => c.is_reconnect && c.showed), [calls]);

// Commitments from funded_investors with commitment_amount > 0
const commitments = useMemo(() => 
  fundedInvestors.filter(f => f.commitment_amount && f.commitment_amount > 0), 
  [fundedInvestors]);
```

#### 2. Update Tab Structure

```tsx
<TabsList className="mb-4 flex flex-wrap">
  <TabsTrigger value="adspend">
    <DollarSign className="h-4 w-4" />
    Ad Spend ({dailyMetrics.length})
  </TabsTrigger>
  <TabsTrigger value="leads">
    <Users className="h-4 w-4" />
    Leads ({leads.length})
  </TabsTrigger>
  <TabsTrigger value="booked">
    <Phone className="h-4 w-4" />
    Booked ({bookedCalls.length})
  </TabsTrigger>
  <TabsTrigger value="showed">
    <CheckCircle className="h-4 w-4" />
    Showed ({showedInitialCalls.length})
  </TabsTrigger>
  <TabsTrigger value="reconnect">
    <RefreshCw className="h-4 w-4" />
    Reconnect ({reconnectCalls.length})
  </TabsTrigger>
  <TabsTrigger value="reconnect-showed">
    <CheckCircle2 className="h-4 w-4" />
    Recon Showed ({reconnectShowedCalls.length})
  </TabsTrigger>
  <TabsTrigger value="commitments">
    <Handshake className="h-4 w-4" />
    Commitments ({commitments.length})
  </TabsTrigger>
  <TabsTrigger value="funded">
    <TrendingUp className="h-4 w-4" />
    Funded ({fundedInvestors.length})
  </TabsTrigger>
</TabsList>
```

#### 3. Add Pagination for New Tabs

```typescript
// Add filtered and paginated data for new tabs
const filteredBookedCalls = useMemo(() => {
  let result = bookedCalls;
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    result = result.filter((call) =>
      (call.outcome?.toLowerCase().includes(query)) ||
      (call.scheduled_at?.includes(query))
    );
  }
  return result;
}, [bookedCalls, searchQuery]);

const filteredReconnectCalls = useMemo(() => {
  let result = reconnectCalls;
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    result = result.filter((call) =>
      (call.outcome?.toLowerCase().includes(query))
    );
  }
  return result;
}, [reconnectCalls, searchQuery]);

// Similar for reconnectShowedCalls and commitments
```

#### 4. Update State and Default Tab

```typescript
const [activeTab, setActiveTab] = useState('adspend'); // Default to Ad Spend first
```

#### 5. Add TabsContent for New Tabs

Each new tab will have its own `TabsContent` with appropriate table columns:

- **Reconnect Calls Tab**: Same columns as Calls tab
- **Reconnect Showed Tab**: Same columns as Showed tab  
- **Commitments Tab**: Name, Commitment Amount, Commitment Date, Lead Link

#### 6. Update CRUD Operations

Extend `handleAddRecord`, `handleEditRecord`, and `handleDeleteRecord` to support new tab types.

#### 7. Update Export Function

```typescript
const handleExport = (exportAll: boolean) => {
  let data: any[] = [];
  switch (activeTab) {
    case 'adspend': data = exportAll ? filteredAdSpend : paginatedAdSpend; break;
    case 'leads': data = exportAll ? filteredLeads : paginatedLeads; break;
    case 'booked': data = exportAll ? filteredBookedCalls : paginatedBookedCalls; break;
    case 'showed': data = exportAll ? filteredShowedCalls : paginatedShowedCalls; break;
    case 'reconnect': data = exportAll ? filteredReconnectCalls : paginatedReconnectCalls; break;
    case 'reconnect-showed': data = exportAll ? filteredReconnectShowed : paginatedReconnectShowed; break;
    case 'commitments': data = exportAll ? filteredCommitments : paginatedCommitments; break;
    case 'funded': data = exportAll ? filteredFunded : paginatedFunded; break;
  }
  exportToCSV(data, `${activeTab}-${exportAll ? 'all' : 'filtered'}`);
};
```

---

## Data Accuracy Considerations

### Date Filtering Already Fixed
The previous fix ensures dates are filtered using local timezone:
- `startDate` creates timestamp at `00:00:00` local time
- `endDate` creates timestamp at `23:59:59.999` local time

### Calls Filtering by `scheduled_at` vs `created_at`
Currently calls are filtered by `created_at`. For booked/showed calls to reflect accurate "scheduled" dates, we may need to filter by `scheduled_at` instead. Will use `scheduled_at` for call records when available.

### Commitments Data
Commitments come from `funded_investors.commitment_amount`. Records where `commitment_amount > 0` and `funded_amount = 0` are pure commitments (not yet funded).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InlineRecordsView.tsx` | Reorganize tabs, add new call type separation, add commitments tab, update pagination/filtering/CRUD |
| `src/hooks/useLeadsAndCalls.ts` | Possibly add filter for calls by `scheduled_at` for more accurate date-based filtering |

---

## Additional Icons Needed

```typescript
import { 
  RefreshCw,  // For Reconnect
  CheckCircle2, // For Reconnect Showed
  Handshake,  // For Commitments
} from 'lucide-react';
```

---

## UI Preview

```text
+------------------------------------------------------------------+
| Detailed Records                            [+ Add] [Export ▾]   |
+------------------------------------------------------------------+
| [Ad Spend] [Leads] [Booked] [Showed] [Reconnect] [Recon Showed]  |
| [Commitments] [Funded]                                           |
+------------------------------------------------------------------+
| 🔍 Search records...        Rep ▾       Showing 150 of 342       |
+------------------------------------------------------------------+
| Date    | Name    | Amount | Impressions | Clicks | CTR | ...    |
| 1/25/26 | -       | $2,412 | 57,052      | 1,023  | 1.79% | ...  |
| 1/24/26 | -       | $2,156 | 48,331      | 892    | 1.85% | ...  |
+------------------------------------------------------------------+
| ◀ Page 1 of 3 ▶                                                  |
+------------------------------------------------------------------+
```

---

## Testing Checklist

1. Verify tabs appear in correct order
2. Verify Ad Spend is the default tab
3. Verify Booked Calls shows only non-reconnect calls
4. Verify Showed Calls shows only showed non-reconnect calls
5. Verify Reconnect Calls shows only reconnect calls that didn't show
6. Verify Reconnect Showed shows only reconnect calls that showed
7. Verify Commitments shows records with commitment_amount > 0
8. Verify Funded shows all funded investor records
9. Verify date filtering works accurately for each tab
10. Verify CRUD operations work for each tab type
11. Verify export works for each tab

