

# Plan: Facebook Ads Library Integration for Funnels

## Overview
Integrate live ads from Facebook Ads Library into the Funnel tab. Since Facebook Ads Library blocks iframe embedding, we'll use **Firecrawl** to scrape ad content (images, videos, text) and display them as rich previews. This enables AI analysis and creative comparisons.

---

## Technical Challenge

**Problem**: Facebook Ads Library blocks iframe embedding via `X-Frame-Options: DENY`, so we cannot embed it directly in a browser mockup.

**Solution**: Use Firecrawl to scrape the page content, extract ad media and text, store the scraped data, and render custom previews that look like real ads.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         FUNNEL TAB                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  Campaign 1     │    │  Campaign 2     │    │  Live Ads       │ │
│  │  (Funnel Steps) │    │  (Funnel Steps) │    │  (From FB)      │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    LIVE ADS SECTION                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │  │
│  │  │ Ad 1    │  │ Ad 2    │  │ Ad 3    │  │ Ad 4    │           │  │
│  │  │ [Image] │  │ [Video] │  │ [Image] │  │ [Video] │           │  │
│  │  │ CTA     │  │ CTA     │  │ CTA     │  │ CTA     │           │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │  │
│  │                                                                │  │
│  │  [Sync Ads from FB Ads Library]  [Analyze with AI]            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### 1. Connect Firecrawl

First, we'll need to link the Firecrawl connector to enable web scraping capabilities.

### 2. Database Schema

**New Table: `client_live_ads`**
```sql
CREATE TABLE public.client_live_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.funnel_campaigns(id) ON DELETE SET NULL,
  
  -- Ad Library metadata
  ad_library_id TEXT,                    -- Facebook ad ID
  ad_library_url TEXT,                   -- Link to FB Ads Library
  page_id TEXT,                          -- Facebook page ID
  page_name TEXT,                        -- Advertiser name
  
  -- Scraped content
  primary_text TEXT,                     -- Main ad copy
  headline TEXT,                         -- Ad headline
  description TEXT,                      -- Link description
  cta_type TEXT,                         -- Call-to-action type
  media_type TEXT,                       -- 'image' | 'video' | 'carousel'
  media_urls JSONB,                      -- Array of image/video URLs
  thumbnail_url TEXT,                    -- Stored thumbnail in our storage
  
  -- Status & tracking
  status TEXT DEFAULT 'active',          -- 'active' | 'inactive' | 'removed'
  platforms JSONB,                       -- ['facebook', 'instagram', 'messenger']
  started_running_on DATE,               -- When ad started
  impressions_bucket TEXT,               -- Impression range if available
  
  -- AI analysis
  ai_analysis JSONB,                     -- AI-generated insights
  last_analyzed_at TIMESTAMPTZ,
  
  -- Scrape tracking
  scraped_at TIMESTAMPTZ DEFAULT now(),
  raw_html TEXT,                         -- Raw scraped data for reprocessing
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.client_live_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view client_live_ads" ON public.client_live_ads FOR SELECT USING (true);
CREATE POLICY "Public can insert client_live_ads" ON public.client_live_ads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update client_live_ads" ON public.client_live_ads FOR UPDATE USING (true);
CREATE POLICY "Public can delete client_live_ads" ON public.client_live_ads FOR DELETE USING (true);

-- Add ads_library_page_id to client_settings
ALTER TABLE public.client_settings 
  ADD COLUMN ads_library_page_id TEXT,
  ADD COLUMN ads_library_url TEXT;
```

### 3. Edge Function: `scrape-fb-ads`

Creates an edge function to scrape Facebook Ads Library using Firecrawl:

```typescript
// supabase/functions/scrape-fb-ads/index.ts

// Key functionality:
// 1. Accept page_id or full Ads Library URL
// 2. Use Firecrawl to scrape the page
// 3. Parse HTML to extract individual ads:
//    - Ad images/video thumbnails
//    - Primary text, headline, description
//    - CTA button text
//    - Platforms where ad is running
//    - Start date
// 4. Download media to Supabase Storage
// 5. Store parsed ads in client_live_ads table
// 6. Return array of scraped ads
```

**Scraping Strategy**:
- Use Firecrawl with `formats: ['html', 'screenshot']`
- Parse the HTML to find ad containers (Facebook's class patterns)
- Extract text content from known element structures
- Capture screenshot as fallback visual

### 4. New Hook: `useLiveAds.ts`

```typescript
// Hooks for:
// - useLiveAds(clientId) - fetch stored ads
// - useScrapeAds() - trigger scrape mutation
// - useDeleteLiveAd() - remove an ad
// - useAnalyzeLiveAd() - run AI analysis
```

### 5. UI Components

**LiveAdsSection.tsx** - Container component:
- Displays in Funnel tab below campaigns OR as separate section
- "Sync from Ads Library" button
- Grid of ad cards
- AI analysis button

**LiveAdCard.tsx** - Individual ad preview:
- Desktop browser mockup frame (similar to DesktopMockup.tsx)
- Displays scraped image/video
- Shows headline, primary text, CTA
- "Active on: Facebook, Instagram" badges
- Quick actions: View in Library, Analyze, Delete

**ScrapeAdsModal.tsx** - Configuration modal:
- Input for Facebook Page ID or Ads Library URL
- Preview of what will be scraped
- Scrape button with progress indicator

### 6. Client Settings Integration

Add fields to ClientSettingsModal.tsx:
- "Facebook Page ID" input
- "Ads Library URL" input (auto-generates from Page ID)
- Quick link to Ads Library

### 7. AI Analysis Integration

Extend the existing `creative-ai-audit` edge function:
- Accept live ads for analysis
- Compare live ads against creatives in review
- Generate improvement suggestions
- Competitor analysis insights

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| **Database Migration** | Create | `client_live_ads` table, update `client_settings` |
| `supabase/functions/scrape-fb-ads/index.ts` | Create | Firecrawl-based ad scraping |
| `src/hooks/useLiveAds.ts` | Create | CRUD hooks for live ads |
| `src/components/funnel/LiveAdsSection.tsx` | Create | Main container for live ads |
| `src/components/funnel/LiveAdCard.tsx` | Create | Individual ad preview card |
| `src/components/funnel/ScrapeAdsModal.tsx` | Create | Modal to configure and trigger scrape |
| `src/components/funnel/FunnelPreviewTab.tsx` | Modify | Add LiveAdsSection below campaigns |
| `src/components/settings/ClientSettingsModal.tsx` | Modify | Add Page ID / Ads Library URL fields |
| `supabase/functions/creative-ai-audit/index.ts` | Modify | Support live ad analysis |

---

## User Flow

1. **Setup (once per client)**:
   - Go to Client Settings
   - Enter Facebook Page ID (e.g., `584060471449732` from the URL)
   - System constructs Ads Library URL automatically

2. **Sync Ads**:
   - Navigate to Funnel tab
   - Click "Sync Live Ads" in Live Ads section
   - System scrapes Ads Library using Firecrawl
   - Ads appear as cards in the section

3. **Preview**:
   - View ads in desktop browser mockup style
   - See all ad text, images, videos
   - Click to open original in FB Ads Library

4. **Analyze**:
   - Click "Analyze with AI" on any ad
   - Get insights on copy, visuals, improvements
   - Compare with pending creatives

---

## Technical Considerations

### Firecrawl Integration
- Uses `formats: ['html', 'screenshot', 'markdown']`
- `waitFor: 3000` to allow dynamic content to load
- May need to handle pagination for pages with many ads

### Media Storage
- Download ad images/videos to Supabase Storage
- Store in `live-ads/{clientId}/{adId}/` bucket
- Use thumbnails for card display

### Rate Limiting
- Firecrawl has usage limits
- Cache scraped data for 24 hours
- Show "last synced" timestamp

### Facebook Ads Library Structure
The Ads Library page contains structured data that can be parsed:
- Ad container divs with specific class patterns
- Image/video elements with src attributes
- Text content in predictable locations
- Meta tags with page info

---

## Dependencies

1. **Firecrawl Connector** - Must be linked to project
2. **Supabase Storage** - For media caching (already available)
3. **Gemini API** - For AI analysis (already configured)

---

## Implementation Order

1. Connect Firecrawl connector to project
2. Create database migration for `client_live_ads` table
3. Build `scrape-fb-ads` edge function
4. Create `useLiveAds` hook
5. Build `LiveAdCard` component with browser mockup
6. Build `LiveAdsSection` container
7. Build `ScrapeAdsModal` for triggering scrape
8. Integrate into `FunnelPreviewTab`
9. Add settings fields for Page ID
10. Extend AI analysis for live ads

