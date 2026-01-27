
# MeetGeek Action Items Enhancement Plan

## Problem
MeetGeek meetings are syncing with summaries but **action items are empty arrays** (`action_items: []`). The current implementation only fetches from the `/insights` endpoint, which may not return action items for newer meeting templates.

## Root Cause Analysis
Based on MeetGeek API documentation, action items are now primarily found in:
1. **Highlights endpoint** (`/v1/meetings/{meetingId}/highlights`) - Items with `label: "Task"` 
2. **Summary parsing** - Action items mentioned in summary text
3. **Insights endpoint** - Legacy approach that may return empty for newer meetings

## Solution Architecture

```text
+------------------------+
| MeetGeek Meeting Sync  |
+------------------------+
           |
    +------v-------+
    | 1. /insights |  (current - often empty)
    +------+-------+
           |
    +------v--------+
    | 2. /highlights|  (NEW - filter by label: "Task")
    +------+--------+
           |
    +------v------------+
    | 3. Parse Summary  |  (NEW - extract "Action Items" section)
    +------+------------+
           |
    +------v--------------+
    | 4. AI Extraction    |  (NEW - fallback using Lovable AI)
    +------+--------------+
           |
    +------v-------------+
    | Merge & Deduplicate |
    +------+-------------+
           |
    +------v-----------------+
    | Store in action_items  |
    | Create pending_tasks   |
    +------------------------+
```

## Technical Implementation

### 1. Update MeetGeek Webhook Edge Function

**Add new interfaces for Highlights:**
```typescript
interface MeetGeekHighlight {
  highlightText: string;
  label: string; // "Task", "Decision", "Question", etc.
  timestamp?: number;
  speaker?: string;
}

interface MeetGeekHighlights {
  highlights: MeetGeekHighlight[];
}
```

**Add Highlights fetch (new endpoint):**
```typescript
// Fetch highlights and extract Task-labeled items
let highlightTasks: any[] = [];
try {
  const highlightsResponse = await fetch(
    `https://api.meetgeek.ai/v1/meetings/${meetingId}/highlights`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );
  if (highlightsResponse.ok) {
    const highlightsData: MeetGeekHighlights = await highlightsResponse.json();
    highlightTasks = (highlightsData.highlights || [])
      .filter((h: MeetGeekHighlight) => h.label === 'Task')
      .map((h: MeetGeekHighlight) => ({
        text: h.highlightText,
        source: 'highlights',
        speaker: h.speaker,
      }));
    console.log(`Found ${highlightTasks.length} tasks from highlights`);
  }
} catch (e) {
  console.log('Could not fetch highlights:', e);
}
```

**Add Summary parsing fallback:**
```typescript
function extractActionItemsFromSummary(summary: string): any[] {
  const actionItems: any[] = [];
  
  // Look for "Action Items", "Next Steps", "Tasks" sections
  const patterns = [
    /action items?:?\s*\n([\s\S]*?)(?=\n\n|$)/gi,
    /next steps?:?\s*\n([\s\S]*?)(?=\n\n|$)/gi,
    /tasks?:?\s*\n([\s\S]*?)(?=\n\n|$)/gi,
    /to-?do:?\s*\n([\s\S]*?)(?=\n\n|$)/gi,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(summary);
    if (match && match[1]) {
      const lines = match[1].split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 5);
      
      lines.forEach(line => {
        actionItems.push({ text: line, source: 'summary_parse' });
      });
    }
  }
  
  return actionItems;
}
```

**Add AI extraction fallback (if no action items found):**
```typescript
async function extractActionItemsWithAI(
  summary: string, 
  transcript: string
): Promise<any[]> {
  if (!summary && !transcript) return [];
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Extract action items from this meeting. Return as JSON array.

Summary: ${summary}

${transcript ? `Transcript excerpt: ${transcript.slice(0, 3000)}` : ''}

Return format: [{"text": "action item description", "assignee": "name if mentioned"}]
Only return the JSON array, nothing else.`
        }],
        temperature: 0.3,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '[]';
      return JSON.parse(content);
    }
  } catch (e) {
    console.log('AI extraction failed:', e);
  }
  return [];
}
```

**Merge all action items sources:**
```typescript
// Combine all sources and deduplicate
const allActionItems = [
  ...highlightTasks,
  ...insightsActionItems,
  ...extractActionItemsFromSummary(summary),
];

// If still empty, use AI extraction
if (allActionItems.length === 0 && (summary || transcript)) {
  const aiItems = await extractActionItemsWithAI(summary, transcript);
  allActionItems.push(...aiItems);
}

// Deduplicate by text similarity
const uniqueItems = deduplicateActionItems(allActionItems);
```

### 2. Update Existing Meetings

After deploying the updated function, trigger a re-sync to update existing meetings with action items:
- Call the sync endpoint for each meeting that has empty action_items
- This will re-fetch from MeetGeek API with the new logic

### 3. Add Debug Logging

Add explicit logging to track which source produced action items:
```typescript
console.log(`Action items sources: highlights=${highlightTasks.length}, insights=${insightsActionItems.length}, summary=${summaryItems.length}, ai=${aiItems.length}`);
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/meetgeek-webhook/index.ts` | Add highlights fetch, summary parsing, AI fallback, merge logic |

## Benefits

1. **Multiple data sources** - Fallback chain ensures action items are captured
2. **AI-powered extraction** - Even if MeetGeek doesn't tag items, AI can find them
3. **Automatic pending tasks** - All extracted items create reviewable pending tasks
4. **Debug visibility** - Logging shows which source produced items

## Testing

After deployment:
1. Trigger manual sync for existing meetings
2. Verify action_items array is populated
3. Check pending_meeting_tasks are created
4. Verify UI displays action items in Meeting Detail modal
