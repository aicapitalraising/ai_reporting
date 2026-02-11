

## Fix: Display Opportunity Values in Funded Investors Drill-Down

### Problem
The Funded Investors modal shows `$0` for most records because these are **commitment-stage** records where the monetary value is stored in `commitment_amount`, not `funded_amount`. The modal only reads `funded_amount`.

Database evidence:
- 20+ records have `funded_amount: 0` but `commitment_amount: 100,000+`
- Only records that reached the actual "funded" stage have `funded_amount > 0`

### Changes

**1. Update `FundedInvestor` type in `src/hooks/useMetrics.ts`**
- Add `commitment_amount` field to the `FundedInvestor` interface
- Add `source` field so the UI can distinguish funded vs commitment records

**2. Update `FundedInvestorsDrillDownModal.tsx`**
- Show a combined "Value" column that displays `funded_amount` if > 0, otherwise falls back to `commitment_amount`
- Add a small badge/label indicating whether the record is "Funded" or "Committed"
- Color the amount green for funded, blue for committed
- Add a "Commitment $" column alongside the existing "Amount" column so both values are visible

**3. Table column layout update**
```
Name | Status | Commitment $ | Funded $ | First Contact | Funded Date | Time to Fund | Calls | Actions
```
- **Status**: Badge showing "Funded" (green) or "Committed" (blue) based on whether `funded_amount > 0`
- **Commitment $**: Shows `commitment_amount` value
- **Funded $**: Shows `funded_amount` value

### Technical Details

**Type change (`useMetrics.ts`):**
```typescript
export interface FundedInvestor {
  // ...existing fields
  commitment_amount: number | null;
  source: string | null;
}
```

**Display logic (`FundedInvestorsDrillDownModal.tsx`):**
```typescript
const displayValue = investor.funded_amount > 0 
  ? investor.funded_amount 
  : (investor.commitment_amount || 0);

const status = investor.funded_amount > 0 ? 'Funded' : 
  (investor.commitment_amount > 0 ? 'Committed' : 'Pending');
```

**Files to edit:**
- `src/hooks/useMetrics.ts` (add fields to interface)
- `src/components/drilldown/FundedInvestorsDrillDownModal.tsx` (update table columns and display logic)
