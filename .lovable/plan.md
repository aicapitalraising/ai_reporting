
# Universal Record Side Panel Enhancement Plan

## Overview

This plan implements a consistent contact viewing experience across the entire platform by:
1. Adding a **Sync button and "Last Synced" timestamp** to the header of the `UniversalRecordPanel`
2. Replacing the **inline row expansion with dropdown** in the Leads table with a click-to-open side panel pattern
3. Ensuring **all record types** (leads, calls, opportunities, funded, commitments) open in the same universal side panel

## Current State Analysis

- **UniversalRecordPanel**: Already exists with all required sections (Contact Info, Opportunity Details, Attribution, Form Responses, GHL Details, Timeline) but is missing a header sync button and last sync timestamp
- **InlineRecordsView**: Uses an expandable row pattern for leads (chevron expands inline attribution/UTM/questions) rather than opening the side panel
- **Leads table rows**: Have a status dropdown for inline editing and row expansion - this should be simplified to just click-to-open
- **Other record types**: Already call `onRecordSelect` which should open the universal panel

## Implementation Details

### 1. Enhance UniversalRecordPanel Header

**File**: `src/components/records/UniversalRecordPanel.tsx`

Add to the Sheet header:
- **Last Synced timestamp**: Display relative time (e.g., "5 minutes ago") with color coding for freshness
- **Manual Sync button**: RefreshCw icon button in top-right that triggers single contact sync
- Import and use the `useSingleContactSync` hook

```text
Header Layout:
┌─────────────────────────────────────────────────────────────┐
│ 👤 Steve M                           Synced 5m ago  [🔄]  X │
└─────────────────────────────────────────────────────────────┘
```

Changes:
- Add `useSingleContactSync` hook
- Add sync button with loading state
- Display `ghl_synced_at` from linked lead with color coding (green = fresh, amber = stale >24h)

### 2. Simplify Leads Table Rows

**File**: `src/components/dashboard/InlineRecordsView.tsx`

Remove from leads table:
- Remove the expand/collapse button (chevron) column
- Remove the inline expandable row content (attribution/UTM/questions grid)
- Remove the `expandedLeadIds` state and `toggleLeadExpansion` function

Modify row click behavior:
- Keep the existing `onClick={() => onRecordSelect?.(lead, 'lead')}` behavior
- This already works to select the record for the side panel

The table will now be a clean list where clicking any row opens the full UniversalRecordPanel.

### 3. Integrate UniversalRecordPanel in InlineRecordsView

**File**: `src/components/dashboard/InlineRecordsView.tsx`

Add state and panel:
- Add state to track which record is open: `const [panelOpen, setPanelOpen] = useState(false)`
- Add the `UniversalRecordPanel` component at the end of the component
- Modify `onRecordSelect` callback to set both `selectedRecord` and open the panel

```typescript
const handleRecordClick = (record: any, type: string) => {
  setSelectedRecord(record);
  setSelectedType(type);
  setPanelOpen(true);
};
```

### 4. Map Record Types Correctly

Ensure all record types map to the correct `recordType` prop:
- `'lead'` → `recordType="lead"`
- `'call'`, `'booked'`, `'showed'`, `'reconnect'` → `recordType="call"`  
- `'funded'`, `'commitment'` → `recordType="funded"`
- `'opportunity'` → `recordType="opportunity"`

### 5. Pass Linked Lead for Optimization

When opening calls/funded records, pass the linked lead as `linkedLead` prop to avoid an extra database fetch:
```typescript
<UniversalRecordPanel
  record={selectedRecord}
  recordType={mappedType}
  clientId={clientId}
  linkedLead={getLinkedLead(selectedRecord, selectedType)}
  open={panelOpen}
  onOpenChange={setPanelOpen}
/>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/records/UniversalRecordPanel.tsx` | Add sync button + last synced to header, use `useSingleContactSync` hook |
| `src/components/dashboard/InlineRecordsView.tsx` | Remove expandable rows, add UniversalRecordPanel, simplify row clicks |

## Visual Reference

Based on the screenshots provided, the final side panel will show:
- **Header**: Contact name with sync button and last synced time in top right
- **Contact Information**: Email, phone, GHL ID with "View in GHL" link
- **Opportunity Details**: Value, status, source, last updated
- **Attribution**: Campaign, Ad Set, Source, Medium, Content, Term, Ad ID
- **Form Responses**: All survey questions with human-readable labels
- **GHL Details**: Notes with timestamps (collapsible, closed by default)
- **Activity Timeline**: Full chronological timeline with sync button

## Technical Considerations

1. **Query Invalidation**: After sync, invalidate `['leads', clientId]` and `['lead-by-contact-id', ...]` queries to refresh panel data
2. **Loading States**: Show spinner on sync button during sync operation
3. **Staleness Colors**: 
   - Green (`text-chart-4`): synced within 24 hours
   - Amber (`text-amber-500`): synced >24 hours ago
   - Gray (`text-muted-foreground`): never synced
4. **Public View**: Hide sync button when `isPublicView` is true
