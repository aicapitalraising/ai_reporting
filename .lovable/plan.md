

# Unified Timeline: Merge Customer Journey into Timeline

## Overview
Consolidate the separate "Timeline" and "Customer Journey" sections into a single, unified "Timeline" view that displays the complete customer journey chronologically for all record types.

---

## Current State

| Section | Content | Record Types |
|---------|---------|--------------|
| **Timeline** (line 1756) | Created/Updated timestamps only | All types |
| **Customer Journey** (line 1833) | Lead created, calls with status, funded events | Leads only |

**Problem**: Two separate sections showing overlapping information, confusing UX.

---

## Proposed Solution

Merge both sections into a single **Timeline** section that:
1. Shows all events chronologically (lead created, calls booked/showed, funded)
2. Works for all record types (not just leads)
3. Uses consistent visual styling with color-coded status badges
4. Eliminates redundant Created/Updated entries when full journey is shown

---

## Implementation Details

### Unified Timeline Structure

For **Leads**:
```
Timeline
├── Lead Created (Jan 27, 10:27 AM)
├── Call Booked (Jan 28, 2:00 PM) - Confirmed
├── Call Showed (Jan 28, 2:30 PM)
├── Reconnect Call Booked (Feb 5, 3:00 PM)
└── Funded $50,000 (Feb 10, 11:00 AM)
```

For **Calls**:
```
Timeline
├── Lead Created (Jan 27, 10:27 AM)      ← From linked lead
├── This Call Scheduled (Jan 28, 2:00 PM) ← Highlighted
└── Call Outcome: Showed
```

For **Funded Investors**:
```
Timeline
├── Lead Created (if linked)
├── First Contact (if available)
├── All Calls (if linked)
└── Funded $50,000 ← This record
```

### Visual Design

Each timeline event will have:
- Color-coded dot based on event type
- Event label with status badge
- Timestamp
- Optional outcome/details

**Color Legend**:
| Event Type | Color |
|------------|-------|
| Lead Created | Blue (chart-1) |
| Call Booked | Amber (chart-3) |
| Call Confirmed | Purple (chart-4) |
| Call Showed | Green (chart-2) |
| Call No Show | Red (destructive) |
| Rescheduled | Amber |
| Funded | Primary/Emerald |

---

## Technical Changes

### File: `src/components/dashboard/InlineRecordsView.tsx`

**1. Remove separate Customer Journey section** (lines 1833-1931)

**2. Enhance Timeline section** (lines 1756-1831) to include:

```typescript
// Build comprehensive timeline events for any record type
const buildTimelineEvents = useMemo(() => {
  const events: TimelineEvent[] = [];
  const linkedLead = getLinkedLead(selectedRecord, selectedType);
  
  // Add lead creation
  if (linkedLead?.created_at || (selectedType === 'lead' && selectedRecord?.created_at)) {
    events.push({
      date: linkedLead?.created_at || selectedRecord.created_at,
      label: 'Lead Created',
      type: 'lead',
      color: 'bg-chart-1'
    });
  }
  
  // Add all linked calls
  const linkedCalls = calls.filter(c => 
    c.lead_id === (linkedLead?.id || selectedRecord?.id) || 
    c.external_id === (linkedLead?.external_id || selectedRecord?.external_id)
  );
  
  linkedCalls.forEach(call => {
    const status = getCallStatusLabel(call);
    events.push({
      date: call.scheduled_at || call.created_at,
      label: `${call.is_reconnect ? 'Reconnect Call' : 'Call'} - ${status.label}`,
      type: 'call',
      color: status.color,
      isCurrentRecord: selectedType === 'call' && call.id === selectedRecord?.id,
      details: call.outcome
    });
  });
  
  // Add funded event
  const linkedFunded = fundedInvestors.find(f => 
    f.lead_id === (linkedLead?.id || selectedRecord?.id) ||
    f.external_id === (linkedLead?.external_id || selectedRecord?.external_id)
  );
  
  if (linkedFunded) {
    events.push({
      date: linkedFunded.funded_at,
      label: `Funded $${Number(linkedFunded.funded_amount).toLocaleString()}`,
      type: 'funded',
      color: 'bg-primary',
      isCurrentRecord: selectedType === 'funded' && linkedFunded.id === selectedRecord?.id
    });
  }
  
  // Sort chronologically
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}, [selectedRecord, selectedType, calls, fundedInvestors, getLinkedLead]);
```

**3. Update Timeline rendering** to use the events array:

```tsx
<div className="space-y-2">
  <h4 className="text-sm font-medium flex items-center gap-2">
    <Clock className="h-4 w-4" />
    Timeline
  </h4>
  <div className="pl-6 border-l-2 border-primary/30 space-y-3">
    {timelineEvents.map((event, idx) => (
      <div key={idx} className={`relative ${event.isCurrentRecord ? 'bg-muted/50 -ml-4 pl-4 py-1 rounded' : ''}`}>
        <div className={`absolute -left-[25px] w-3 h-3 rounded-full ${event.color}`} />
        <p className="text-sm font-medium">{event.label}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(event.date).toLocaleString()}
        </p>
        {event.details && event.details !== event.label.toLowerCase() && (
          <p className="text-xs text-muted-foreground">
            Outcome: {event.details}
          </p>
        )}
      </div>
    ))}
  </div>
</div>
```

---

## Visual Comparison

### Before (Two Separate Sections)
```
┌─────────────────────────────────┐
│ Timeline                        │
│ ● Created: 1/27/2026 10:27 AM  │
│ ● Updated: 1/27/2026 10:27 AM  │
├─────────────────────────────────┤
│ Customer Journey                │
│ ● Lead Created                  │
│ ● Call - Confirmed              │
│ ● Call - Showed                 │
│ ● Funded $50,000               │
└─────────────────────────────────┘
```

### After (Unified Timeline)
```
┌─────────────────────────────────┐
│ Timeline                        │
│ ● Lead Created                  │
│   1/27/2026, 10:27 AM          │
│ ● Call - Confirmed              │
│   1/28/2026, 2:00 PM           │
│ ● Call - Showed                 │
│   1/28/2026, 2:30 PM           │
│ ● Funded $50,000               │
│   2/10/2026, 11:00 AM          │
└─────────────────────────────────┘
```

---

## Benefits

1. **Single Source of Truth**: One timeline shows everything
2. **Consistent UX**: Same timeline format for all record types
3. **Full Journey Visibility**: See complete customer journey from any record
4. **Reduced Redundancy**: No duplicate Created/Updated entries
5. **Better Context**: When viewing a call, see the full lead journey

---

## Estimated Changes

| Component | Lines Changed |
|-----------|---------------|
| Timeline event builder | ~60 new lines |
| Timeline renderer update | ~40 lines |
| Remove Customer Journey section | -100 lines |
| **Net Change** | ~0 lines (refactor) |

---

## Edge Cases Handled

- **No linked lead**: Show only the current record's dates
- **Ad Spend records**: Show just the date (no journey)
- **Orphan calls**: Show call without lead context
- **Multiple calls**: All sorted chronologically
- **Current record highlight**: Subtle background to show which event is the selected record

