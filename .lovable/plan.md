

## Plan: Fetch Full HD Ad Creatives via Meta Graph API

### Problem
Currently, ad previews only show low-res thumbnails (`thumbnail_url`, `image_url` from creative object). For video ads, there's no video source URL at all -- just a thumbnail. The user wants full HD images and video source URLs.

### Approach: Enhance Meta Graph API Sync (no Apify needed)

The Meta Graph API already supports fetching full-resolution media. The existing sync function requests `creative{id,thumbnail_url,image_url,object_story_spec}` but doesn't follow up to get full-res assets. We can extend this.

**For video ads:** Fetch the video ID from `object_story_spec.video_data.video_id`, then call `GET /{video_id}?fields=source,picture` to get the HD video URL and poster image.

**For image ads:** Fetch `creative{image_url,object_story_spec}` -- the `image_url` from the creative endpoint is already full-resolution. For link ads, we can get the full image from `link_data.image_hash` via `GET /{ad_account_id}/adimages?hashes=['hash']`.

### Changes

**1. Database migration**
- Add `video_source_url TEXT` and `full_image_url TEXT` columns to `meta_ads` table.

**2. New edge function: `fetch-ad-media-hd/index.ts`**
- Accepts `{ clientId, adId }` (single ad) or `{ clientId }` (batch all ads).
- Reads the ad's `creative_id` and `meta_ad_id` from `meta_ads`.
- Calls Meta Graph API:
  - `GET /{creative_id}?fields=object_story_spec,image_url,thumbnail_url`
  - If video: `GET /{video_id}?fields=source,picture` → stores `video_source_url`
  - If image: stores full `image_url` as `full_image_url`
- Updates `meta_ads` row with HD URLs.

**3. Update `sync-meta-ads/index.ts`**
- During ad sync, also extract `video_id` from `object_story_spec.video_data` and call `GET /{video_id}?fields=source` to populate `video_source_url` inline.

**4. Frontend: Ad preview modal enhancement**
- In `AdsManagerTab.tsx` preview dialog:
  - If `video_source_url` exists, render a `<video>` player instead of a static thumbnail.
  - If `full_image_url` exists, show that instead of `image_url`/`thumbnail_url`.
  - Add a "Fetch HD" button that calls the new edge function for ads missing HD media.
  - Add a "Download HD" button that opens the full-res URL in a new tab.

**5. LiveAdCard enhancement**
- For Live Ads (Ad Library), the `ad_snapshot_url` is a Facebook-hosted preview page, not direct media. Add a note that HD is only available for ads synced via Ads Manager (where we have API access to the creative).

### UI Preview (Ad Preview Modal)

```text
┌─────────────────────────────┐
│ Ad Name          🏆 Winning │
├─────────────────────────────┤
│  ┌─────────────────────┐    │
│  │   ▶ HD Video Player │    │  ← <video> if video_source_url
│  │   or Full-Res Image │    │  ← <img> if full_image_url
│  └─────────────────────┘    │
│  Headline text              │
│  Body copy...               │
│                             │
│  Spend  ROAS  CTR  CPL  CPA │
│  $5.1k  0.0x  1.4% $0   $0 │
│                             │
│  [⬇ Download HD] [✨ Vars]  │
└─────────────────────────────┘
```

### Scope
- 1 migration (2 new columns)
- 1 new edge function
- Update `sync-meta-ads` to fetch video source URLs during sync
- Update `AdsManagerTab.tsx` preview modal
- Add `useAdMediaHD` hook for on-demand HD fetch

