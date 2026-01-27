

# Enhanced Funnel Section: Campaigns, Improved Mockups & PageSpeed Integration

This plan restructures the Funnel tab to support multiple campaigns, improved device mockups matching real phone UIs, visual flow progression, and Google PageSpeed testing.

---

## Overview

The enhanced Funnel section will transform from a flat list of steps into a campaign-based structure with:

1. **Campaign Grouping** - Steps organized under named campaigns (e.g., "1031 Exchange", "Accredited Investor")
2. **Improved iPhone Mockup** - Realistic iOS status bar, Safari bottom nav, matching the reference screenshot
3. **Visual Flow Progression** - Numbered step cards (1 → 2 → 3) with connecting arrows like Funnelytics
4. **Multi-Device Responsive Previews** - iPhone, iPad, Desktop browser mockups
5. **Google PageSpeed Integration** - Test page performance directly from the funnel view
6. **Single Unified Tab** - Everything under one Funnel tab in Project Management section

---

## Feature 1: Campaign Data Structure

### Database Schema Change

Add a `funnel_campaigns` table to group steps:

```sql
CREATE TABLE public.funnel_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f3f4f6',  -- Background color for visual distinction
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add campaign_id to existing steps table
ALTER TABLE public.client_funnel_steps 
ADD COLUMN campaign_id UUID REFERENCES public.funnel_campaigns(id) ON DELETE CASCADE;
```

### Updated Data Interfaces

```typescript
interface FunnelCampaign {
  id: string;
  client_id: string;
  name: string;
  color: string;  // e.g., '#f3f4f6' for gray, '#ffffff' for white
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface FunnelStep {
  id: string;
  client_id: string;
  campaign_id: string | null;  // NEW: Link to campaign
  name: string;
  url: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

---

## Feature 2: Improved iPhone Mockup (Matching Reference)

### Visual Updates to Match Real iOS

Based on the reference screenshot showing a real iPhone with Safari browser:

**2.1 Status Bar**
- Time display (top left)
- Signal bars, WiFi icon, battery indicator (top right)
- Proper iOS 17+ styling

**2.2 Safari Bottom Navigation Bar**
- Back arrow button (left)
- Message/chat icon
- URL display showing domain (e.g., "investbluecapfunds.com")
- Refresh icon
- More options (...)
- Frosted glass appearance with rounded pill buttons

**2.3 Implementation**

```typescript
// Updated IPhoneMockup with iOS Safari UI
<div className="relative bg-black rounded-[50px] p-3 shadow-xl">
  {/* Dynamic Island */}
  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-full z-20" />
  
  {/* Screen */}
  <div className="bg-white rounded-[40px] overflow-hidden">
    {/* Status Bar */}
    <div className="h-12 bg-white flex items-center justify-between px-8 pt-2">
      <span className="text-sm font-semibold">2:24</span>
      <div className="flex items-center gap-1">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon value={71} />
      </div>
    </div>
    
    {/* Content Iframe */}
    <div className="w-[375px] h-[680px] overflow-hidden">
      <iframe src={url} ... />
    </div>
    
    {/* Safari Bottom Bar */}
    <div className="h-20 bg-white/80 backdrop-blur border-t flex items-center justify-around px-4">
      <button className="p-3 bg-gray-100 rounded-full"><ChevronLeft /></button>
      <button className="p-3 bg-gray-100 rounded-full"><MessageSquare /></button>
      <div className="px-4 py-2 bg-gray-100 rounded-full text-sm truncate max-w-[180px]">
        {getDomain(url)}
      </div>
      <button className="p-3 bg-gray-100 rounded-full"><RefreshCw /></button>
      <button className="p-3 bg-gray-100 rounded-full"><MoreHorizontal /></button>
    </div>
  </div>
  
  {/* Home Indicator */}
  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-400 rounded-full" />
</div>
```

---

## Feature 3: Campaign-Based Flow View

### Visual Design (Matching Funnelytics Style)

Each campaign displays as a titled section with steps flowing horizontally:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  1031 Exchange                                                    [+ Add Step] │
│  ┌─────────────────────┐        ┌─────────────────────┐                      │
│  │ [1] 1031 Exchange   │  ───→  │ [2] 1031 Book A Call│                      │
│  │ ┌─────────────────┐ │        │ ┌─────────────────┐ │                      │
│  │ │  Page Preview   │ │        │ │  Page Preview   │ │                      │
│  │ │  (thumbnail)    │ │        │ │  (thumbnail)    │ │                      │
│  │ └─────────────────┘ │        │ └─────────────────┘ │                      │
│  │ investbluecapfunds  │        │ investbluecapfunds  │                      │
│  └─────────────────────┘        └─────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  RV Park Fund                                                     [+ Add Step] │
│  (different background color for visual distinction)                         │
│  ...steps...                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```typescript
// CampaignFlowSection.tsx
interface CampaignFlowSectionProps {
  campaign: FunnelCampaign;
  steps: FunnelStep[];
  onAddStep: () => void;
  onReorder: (orderedIds: string[]) => void;
  deviceType: DeviceType;
  isPublicView: boolean;
}

export function CampaignFlowSection({ campaign, steps, ... }: CampaignFlowSectionProps) {
  return (
    <div 
      className="rounded-xl p-6 mb-6"
      style={{ backgroundColor: campaign.color }}
    >
      {/* Campaign Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          {campaign.name}
        </h3>
        {!isPublicView && (
          <Button size="sm" variant="outline" onClick={onAddStep}>
            <Plus className="h-4 w-4 mr-1" /> Add Step
          </Button>
        )}
      </div>
      
      {/* Flow Diagram with Steps */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <FunnelStepCard 
              step={step} 
              stepNumber={index + 1}
              deviceType={deviceType}
            />
            {index < steps.length - 1 && (
              <ArrowRight className="mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Feature 4: Google PageSpeed Integration

### Implementation Approach

Add a "Test Speed" button on each step card that calls Google's PageSpeed Insights API:

**4.1 Edge Function for PageSpeed**

Create `supabase/functions/pagespeed-test/index.ts`:

```typescript
const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

Deno.serve(async (req) => {
  const { url, strategy = 'mobile' } = await req.json();
  
  const apiUrl = `${PAGESPEED_API}?url=${encodeURIComponent(url)}&strategy=${strategy}`;
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  // Extract key metrics
  const lighthouse = data.lighthouseResult;
  return new Response(JSON.stringify({
    performanceScore: lighthouse.categories.performance.score * 100,
    metrics: {
      firstContentfulPaint: lighthouse.audits['first-contentful-paint'].displayValue,
      speedIndex: lighthouse.audits['speed-index'].displayValue,
      largestContentfulPaint: lighthouse.audits['largest-contentful-paint'].displayValue,
      timeToInteractive: lighthouse.audits['interactive'].displayValue,
      totalBlockingTime: lighthouse.audits['total-blocking-time'].displayValue,
      cumulativeLayoutShift: lighthouse.audits['cumulative-layout-shift'].displayValue,
    }
  }));
});
```

**4.2 PageSpeed Button & Modal**

```typescript
// PageSpeedButton.tsx
function PageSpeedButton({ url }: { url: string }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PageSpeedResults | null>(null);
  
  const runTest = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('pagespeed-test', {
      body: { url, strategy: 'mobile' }
    });
    setResults(data);
    setLoading(false);
  };
  
  return (
    <>
      <Button size="sm" variant="ghost" onClick={runTest} disabled={loading}>
        <Gauge className="h-4 w-4 mr-1" />
        {loading ? 'Testing...' : 'Speed Test'}
      </Button>
      
      {results && (
        <PageSpeedResultsModal 
          results={results} 
          onClose={() => setResults(null)} 
        />
      )}
    </>
  );
}
```

**4.3 Results Display**

Show a modal or popover with:
- Overall performance score (0-100 with color coding)
- Core Web Vitals: FCP, LCP, TBT, CLS
- Speed Index and Time to Interactive
- Mobile vs Desktop toggle

---

## Feature 5: Unified Tab Structure

### Single Funnel Tab Layout

All functionality consolidated under one tab:

```typescript
// FunnelPreviewTab.tsx (updated)
export function FunnelPreviewTab({ clientId, isPublicView }: Props) {
  const [viewMode, setViewMode] = useState<'flow' | 'preview'>('flow');
  const [deviceType, setDeviceType] = useState<DeviceType>('phone');
  
  const { data: campaigns = [] } = useFunnelCampaigns(clientId);
  const { data: steps = [] } = useFunnelSteps(clientId);
  
  // Group steps by campaign
  const stepsByCampaign = useMemo(() => {
    return campaigns.map(campaign => ({
      campaign,
      steps: steps.filter(s => s.campaign_id === campaign.id)
        .sort((a, b) => a.sort_order - b.sort_order)
    }));
  }, [campaigns, steps]);
  
  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Funnel Preview</h2>
          <p className="text-sm text-muted-foreground">
            Visualize and test your funnels across devices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <DeviceSwitcher value={deviceType} onChange={setDeviceType} />
          {!isPublicView && <AddCampaignButton clientId={clientId} />}
        </div>
      </div>
      
      {/* Campaign Sections */}
      {stepsByCampaign.map(({ campaign, steps }) => (
        <CampaignFlowSection
          key={campaign.id}
          campaign={campaign}
          steps={steps}
          deviceType={deviceType}
          isPublicView={isPublicView}
        />
      ))}
      
      {/* Empty State */}
      {campaigns.length === 0 && (
        <EmptyState onAddCampaign={() => setAddCampaignOpen(true)} />
      )}
    </div>
  );
}
```

---

## Technical Summary

| Component | Changes |
|-----------|---------|
| `supabase/migrations/` | Add `funnel_campaigns` table, add `campaign_id` to `client_funnel_steps` |
| `src/hooks/useFunnelCampaigns.ts` | **NEW** - CRUD hooks for campaigns |
| `src/hooks/useFunnelSteps.ts` | Update to include `campaign_id` field |
| `src/components/funnel/IPhoneMockup.tsx` | Complete redesign with iOS Safari UI |
| `src/components/funnel/CampaignFlowSection.tsx` | **NEW** - Campaign container with flow |
| `src/components/funnel/FunnelStepCard.tsx` | **NEW** - Individual step card with thumbnail |
| `src/components/funnel/PageSpeedButton.tsx` | **NEW** - PageSpeed test trigger |
| `src/components/funnel/PageSpeedModal.tsx` | **NEW** - Results display modal |
| `src/components/funnel/FunnelPreviewTab.tsx` | Refactor for campaign-based structure |
| `supabase/functions/pagespeed-test/index.ts` | **NEW** - Edge function for PageSpeed API |

---

## User Experience Flow

### Adding a Campaign
1. Click "+ Add Campaign" button
2. Enter campaign name (e.g., "1031 Exchange")
3. Optionally pick background color (gray, white, light blue, etc.)
4. Campaign section appears with empty state

### Adding Steps to Campaign
1. Click "+ Add Step" within a campaign section
2. Enter step name and URL
3. Step appears in flow with automatic numbering
4. Drag to reorder within the campaign

### Testing Page Speed
1. Click "Speed Test" icon on any step card
2. Loading spinner while API runs (~5-10 seconds)
3. Modal opens with performance score and metrics
4. Toggle between Mobile and Desktop results

### Device Preview
1. Select device type (Phone/Tablet/Desktop)
2. All step previews update to selected mockup
3. Flow view shows compact cards; Preview view shows full mockups

---

## Visual Design Notes

### Campaign Backgrounds
- Default: `#f3f4f6` (light gray)
- Alternative: `#ffffff` (white with border)
- Accent: `#f0fdf4` (light green for active campaigns)

### Step Cards in Flow Mode
- White cards with subtle shadow
- Green numbered badge (matching existing design)
- Thumbnail preview at ~0.2 scale
- Domain URL below thumbnail
- Action buttons on hover (Edit, Delete, Speed Test, Open)

### Connecting Arrows
- Simple horizontal arrow between consecutive steps
- Muted foreground color
- Could add animation later for visual interest

