
# Creative Upload AI Review & Aspect-Ratio Preview Formatting

## Overview

Two enhancements to the creative workflow:

1. **Auto AI Spelling/Grammar Review (Agency Only)**: When agency team members upload creatives, automatically run an AI spelling/grammar check on the headline and body copy. If issues are found, flag the creative with feedback or auto-reject.

2. **Aspect Ratio-Aware Preview Formatting**: Detect the actual dimensions of uploaded images/videos and display them correctly in platform previews, respecting 1:1, 9:16, and 16:9 ratios instead of always cropping with `object-cover`.

---

## Part 1: Auto AI Spelling/Grammar Review on Upload

### How It Works

```text
┌─────────────────────────────────────────────────────────────┐
│              AGENCY USER UPLOADS CREATIVE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. File uploaded to Supabase Storage                      │
│   2. Creative record created with status='pending'          │
│   3. IF agency user AND has text (headline/body_copy):      │
│      → Call AI spelling/grammar check                       │
│      → If issues found:                                     │
│        • Add AI comment with feedback                       │
│        • Change status to 'revisions' if critical           │
│      → If clean: keep status='pending'                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Edge Function Enhancement

**File: `supabase/functions/creative-ai-audit/index.ts`**

Add a new action `spelling_check` that analyzes the text content:

```typescript
if (action === "spelling_check") {
  const textContent = `
    Headline: ${creative.headline || ''}
    Body Copy: ${creative.body_copy || ''}
    CTA: ${creative.cta_text || ''}
  `.trim();
  
  // Prompt AI to check for spelling/grammar issues
  const prompt = `You are a proofreader. Analyze this ad copy for spelling and grammar errors ONLY.
  
  ${textContent}
  
  Respond with JSON:
  {
    "hasErrors": true/false,
    "severity": "none" | "minor" | "critical",
    "errors": [{"text": "...", "issue": "...", "suggestion": "..."}],
    "summary": "Brief summary of issues or 'No issues found'"
  }
  
  - "critical" = misspellings or major grammar errors that look unprofessional
  - "minor" = style suggestions, optional improvements
  - "none" = clean copy`;
  
  // Call Gemini and return structured response
}
```

### Hook Enhancement

**File: `src/hooks/useCreatives.ts`**

Modify `useCreateCreative` to:
1. Accept a flag indicating if this is an agency upload
2. After successful creation, call the spelling check endpoint
3. Update the creative with AI feedback if issues found

```typescript
// After successful insert, if agency upload and has text content:
if (isAgencyUpload && (creative.headline || creative.body_copy)) {
  const spellCheckResult = await supabase.functions.invoke('creative-ai-audit', {
    body: { action: 'spelling_check', creative: data }
  });
  
  if (spellCheckResult.data?.hasErrors) {
    // Add AI comment with feedback
    await supabase.from('creatives').update({
      comments: [{
        id: Date.now().toString(),
        author: 'AI Review',
        text: spellCheckResult.data.summary,
        createdAt: new Date().toISOString()
      }],
      // If critical errors, set to revisions
      status: spellCheckResult.data.severity === 'critical' ? 'revisions' : 'pending'
    }).eq('id', data.id);
    
    toast.warning('AI found spelling/grammar issues - please review');
  }
}
```

### UI Integration

**File: `src/components/creative/CreativeApproval.tsx`**

Pass the team member context to the upload handlers:

```typescript
const { currentMember } = useTeamMember();
const isAgencyUpload = !!currentMember && !isPublicView;

// In handleUpload and handleBulkUpload:
await createCreative.mutateAsync({
  ...creativeData,
  isAgencyUpload, // New flag
});
```

---

## Part 2: Aspect Ratio-Aware Preview Formatting

### How It Works

```text
┌───────────────────────────────────────────────────────────────────┐
│                  ASPECT RATIO DETECTION FLOW                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Uploaded Image/Video                                            │
│         ↓                                                         │
│   On load, detect dimensions → Calculate ratio                    │
│         ↓                                                         │
│   ┌─────────────┬─────────────┬─────────────┐                     │
│   │    1:1      │    9:16     │    16:9     │                     │
│   │  (Square)   │  (Portrait) │ (Landscape) │                     │
│   └─────────────┴─────────────┴─────────────┘                     │
│         ↓                                                         │
│   Apply appropriate container sizing per platform:                │
│                                                                   │
│   FEED (FB/IG):                                                   │
│   • 1:1 → Square container                                        │
│   • 9:16 → 4:5 container (max allowed, letterboxed)              │
│   • 16:9 → 16:9 container with object-contain                     │
│                                                                   │
│   STORIES (9:16 format):                                          │
│   • Always 9:16 container                                         │
│   • 1:1/16:9 → Scaled down with background blur effect            │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Database Schema Update

Add an `aspect_ratio` field to store detected dimensions:

```sql
ALTER TABLE creatives ADD COLUMN IF NOT EXISTS aspect_ratio TEXT;
-- Values: '1:1', '9:16', '16:9', '4:5', 'other'
```

### File Upload Enhancement

**File: `src/hooks/useCreatives.ts`**

Detect aspect ratio before upload:

```typescript
async function detectAspectRatio(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        resolve(categorizeRatio(ratio));
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        const ratio = video.videoWidth / video.videoHeight;
        resolve(categorizeRatio(ratio));
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    } else {
      resolve('1:1'); // Default for copy
    }
  });
}

function categorizeRatio(ratio: number): string {
  if (ratio > 1.7) return '16:9';     // Landscape (1.78)
  if (ratio > 1.1) return '4:5';      // Slightly wide
  if (ratio > 0.9) return '1:1';      // Square (0.9-1.1)
  if (ratio > 0.5) return '9:16';     // Portrait (0.5625)
  return '9:16';                       // Very tall
}
```

### Preview Component Enhancement

**File: `src/components/creative/CreativeHorizontalPreview.tsx`**

Update `renderMedia` to respect aspect ratio:

```typescript
const renderMedia = (platform: string, containerAspect: string) => {
  const creativeAspect = creative.aspect_ratio || '1:1';
  
  // Determine if we should use object-cover or object-contain
  const shouldContain = !aspectsMatch(containerAspect, creativeAspect);
  const objectFit = shouldContain ? 'object-contain' : 'object-cover';
  const bgClass = shouldContain ? 'bg-black' : 'bg-muted';
  
  if (creative.type === 'image' && creative.file_url) {
    return (
      <div className={`relative w-full h-full ${bgClass}`}>
        <img 
          src={creative.file_url} 
          alt={creative.title}
          className={`w-full h-full ${objectFit}`}
        />
      </div>
    );
  }
  // Similar for video...
};

// Helper to check if aspects are compatible
function aspectsMatch(container: string, content: string): boolean {
  // Feed containers (4:5) work well with 1:1 and 9:16
  // Stories (9:16) work well with 9:16
  // etc.
  if (container === '4:5' && ['1:1', '4:5', '9:16'].includes(content)) return true;
  if (container === '9:16' && content === '9:16') return true;
  if (container === '16:9' && content === '16:9') return true;
  return container === content;
}
```

### Visual Preview Adjustments

For each platform preview in `CreativeHorizontalPreview.tsx`:

**Facebook/Instagram Feed:**
- Square creatives (1:1): Display in square container
- Portrait creatives (9:16): Display in 4:5 container (Meta's max)
- Landscape creatives (16:9): Display with letterboxing

**Stories (IG/FB):**
- Portrait (9:16): Full bleed
- Square/Landscape: Centered with blurred background edges

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/creative-ai-audit/index.ts` | Modify | Add `spelling_check` action with structured JSON response |
| `src/hooks/useCreatives.ts` | Modify | Add aspect ratio detection, AI spelling check after agency uploads |
| `src/components/creative/CreativeApproval.tsx` | Modify | Pass `isAgencyUpload` flag to mutation, import TeamMemberContext |
| `src/components/creative/CreativeHorizontalPreview.tsx` | Modify | Update renderMedia to respect aspect ratio, use object-contain when needed |
| `src/components/creative/PlatformAdPreview.tsx` | Modify | Similar aspect ratio handling for single previews |

Database migration:
```sql
ALTER TABLE creatives ADD COLUMN IF NOT EXISTS aspect_ratio TEXT;
```

---

## User Experience

### Agency Upload Flow:
1. Upload creative with headline/body copy
2. File uploads, dimensions detected → `aspect_ratio` stored
3. AI reviews text content in background
4. If spelling/grammar issues:
   - Toast: "AI found issues - please review"
   - Comment added from "AI Review"
   - Critical errors → status set to "revisions"
5. Previews display correctly based on actual file dimensions

### Preview Behavior:
- 16:9 landscape video → Shows full width with letterboxing in feed
- 9:16 portrait → Fills stories perfectly, crops to 4:5 in feed
- 1:1 square → Displays as square, centered in stories with blur background
