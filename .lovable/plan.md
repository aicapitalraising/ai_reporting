
# Plan: Add Filtering to Attribution Dashboard

## Summary

Enhance the Attribution Dashboard with multi-select filtering capabilities for Source, Campaign Name, Ad Set Name, and Ad Name. This allows users to drill down into specific attribution segments and compare performance across different UTM parameters.

---

## Current State

The Attribution Dashboard currently:
- Aggregates by Campaign, Ad Set, or Ad (view toggle)
- Has its own date range filter (independent from global)
- Shows conversion funnel metrics (Lead→Booked→Showed→Funded)

**Available fields in Lead data:**
- `utm_source` - Traffic source (e.g., "Facebook")
- `campaign_name` - Campaign identifier (e.g., "Facebook", "TOF | Blue Cap | Lead Form | Static | CBO")
- `ad_set_name` - Ad set identifier (e.g., "Broad | iOS Users | Static-Ad-6")
- `ad_id` - Individual ad identifier

---

## Implementation Details

### 1. Add Filter State

Add state for each filter dimension:

```typescript
const [sourceFilter, setSourceFilter] = useState<string[]>([]);
const [campaignFilter, setCampaignFilter] = useState<string[]>([]);
const [adSetFilter, setAdSetFilter] = useState<string[]>([]);
const [adFilter, setAdFilter] = useState<string[]>([]);
```

### 2. Extract Unique Values

Create memoized lists of unique values for each filter dropdown:

```typescript
const uniqueSources = useMemo(() => {
  const sources = new Set<string>();
  leads.forEach(lead => {
    if (lead.utm_source) sources.add(lead.utm_source);
  });
  return Array.from(sources).sort();
}, [leads]);

const uniqueCampaigns = useMemo(() => {
  const campaigns = new Set<string>();
  leads.forEach(lead => {
    if (lead.campaign_name) campaigns.add(lead.campaign_name);
  });
  return Array.from(campaigns).sort();
}, [leads]);

// Similar for ad sets and ads
```

### 3. Filter Interface Design

Add a collapsible filter section below the header:

```text
+------------------------------------------------------------------+
| Attribution Dashboard                    [Date ▾] [View: Campaigns]|
+------------------------------------------------------------------+
| 🔍 Filters                                              [Clear All]|
|                                                                    |
| Source:     [All ▾] or [Facebook] [Google] [+2]                   |
| Campaign:   [All ▾] or [TOF | Blue Cap...] [+3]                   |
| Ad Set:     [All ▾] or [Broad | iOS Users...] [+1]                |
| Ad:         [All ▾] or [Static-Ad-6] [Static-Ad-7]                |
+------------------------------------------------------------------+
```

### 4. Multi-Select Dropdown Component

Create filter dropdowns that support:
- Multi-select with checkboxes
- Search/filter within options
- Selected count badge
- Clear selection button

```typescript
interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}
```

### 5. Apply Filters to Data

Update `filteredLeads` memo to include all filters:

```typescript
const filteredLeads = useMemo(() => {
  return leads.filter(lead => {
    const createdAt = new Date(lead.created_at);
    const inDateRange = createdAt >= dateRange.from && createdAt <= dateRange.to;
    
    // Apply source filter (if any selected)
    const matchesSource = sourceFilter.length === 0 || 
      (lead.utm_source && sourceFilter.includes(lead.utm_source));
    
    // Apply campaign filter
    const matchesCampaign = campaignFilter.length === 0 || 
      (lead.campaign_name && campaignFilter.includes(lead.campaign_name));
    
    // Apply ad set filter
    const matchesAdSet = adSetFilter.length === 0 || 
      (lead.ad_set_name && adSetFilter.includes(lead.ad_set_name));
    
    // Apply ad filter
    const matchesAd = adFilter.length === 0 || 
      (lead.ad_id && adFilter.includes(lead.ad_id));
    
    return inDateRange && matchesSource && matchesCampaign && matchesAdSet && matchesAd;
  });
}, [leads, dateRange, sourceFilter, campaignFilter, adSetFilter, adFilter]);
```

### 6. Active Filters Display

Show active filters as removable chips:

```text
Active: [Source: Facebook ×] [Campaign: TOF | Blue Cap... ×] [Clear All]
```

---

## UI Layout

```text
+------------------------------------------------------------------------+
| 📈 Attribution Dashboard                     [Last 30 Days ▾] [View ▾] |
+------------------------------------------------------------------------+
| Filters:                                                               |
| ┌──────────────┐ ┌────────────────────┐ ┌────────────┐ ┌────────────┐ |
| │ Source     ▾ │ │ Campaign         ▾ │ │ Ad Set   ▾ │ │ Ad       ▾ │ |
| │ Facebook (2) │ │ All Campaigns      │ │ All Sets   │ │ All Ads    │ |
| └──────────────┘ └────────────────────┘ └────────────┘ └────────────┘ |
|                                                                        |
| Active: [Facebook ×] [TOF | Blue Cap... ×]              [Clear All]   |
+------------------------------------------------------------------------+
| [Chart showing filtered data]                                          |
+------------------------------------------------------------------------+
| [Table showing filtered data with conversion rates]                    |
+------------------------------------------------------------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/AttributionDashboard.tsx` | Add filter state, filter dropdowns, update data filtering logic |

---

## New Components (Inline)

### FilterDropdown

A reusable multi-select dropdown:

```typescript
function FilterDropdown({ 
  label, 
  options, 
  selected, 
  onChange, 
  icon 
}: FilterDropdownProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {icon}
          <span>{label}</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <Input placeholder={`Search ${label}...`} className="mb-2" />
        <ScrollArea className="h-48">
          {options.map(option => (
            <div key={option} className="flex items-center space-x-2 py-1">
              <Checkbox 
                checked={selected.includes(option)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selected, option]);
                  } else {
                    onChange(selected.filter(s => s !== option));
                  }
                }}
              />
              <label className="text-sm truncate">{option}</label>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Filter Logic Flow

```text
User selects filter(s)
        |
        v
+-------------------+
| Update filter     |
| state (useState)  |
+-------------------+
        |
        v
+-------------------+
| filteredLeads     |
| useMemo recomputes|
| with all filters  |
+-------------------+
        |
        v
+-------------------+
| attributionData   |
| useMemo recomputes|
| aggregations      |
+-------------------+
        |
        v
+-------------------+
| Chart + Table     |
| update with       |
| filtered data     |
+-------------------+
```

---

## Expected Outcome

1. **Four filter dropdowns** appear below the header (Source, Campaign, Ad Set, Ad)
2. **Multi-select support** - users can select multiple values per filter
3. **Search within dropdowns** - quickly find specific campaigns/ad sets
4. **Active filter chips** - visual display of current filters with remove buttons
5. **Clear All button** - reset all filters at once
6. **Cascading filters** - data updates immediately as filters change
7. **Empty state handling** - show message when no data matches filters
