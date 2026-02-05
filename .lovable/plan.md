
# Platform Enhancement Plan: Creatives Tab, Task Panel & Multi-Select

## Overview

This plan addresses three main feature requests:
1. **Dedicated Creatives route** (`/client/:clientId/creatives`) with its own shareable URL
2. **Task side panel** - Tasks open in a slide-out panel (like records), with a copyable task URL
3. **Multi-select tasks** - Bulk actions for changing due dates and deleting

---

## 1. Dedicated Creatives Route with Shareable URL

### What You'll Get

- A new route `/client/:clientId/creatives` that opens the Creatives section directly
- Public equivalent: `/public/:token/creatives` for client access
- The Creatives tab remains visible in the main navigation alongside other tabs
- Direct links can be shared with clients to go straight to creative approval

### Route Structure

```text
Internal Routes:
├── /client/:clientId            → Client Detail (current)
├── /client/:clientId/creatives  → Creatives Tab (NEW)
└── /client/:clientId/records    → Records (existing)

Public Routes:
├── /public/:token               → Public Report (current)
└── /public/:token/creatives     → Creative Approval (NEW)
```

### Navigation Behavior

| Location | Behavior |
|----------|----------|
| Client Detail page | Creatives tab navigates to `/client/:clientId/creatives` |
| Creatives page header | "Back to Dashboard" returns to `/client/:clientId` |
| Public Report | Creatives section navigates to `/public/:token/creatives` |

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add new routes for `/client/:clientId/creatives` and `/public/:token/creatives` |
| `src/pages/ClientCreatives.tsx` | **NEW** - Dedicated creatives page with full header |
| `src/pages/PublicCreatives.tsx` | **NEW** - Public-facing creatives page |
| `src/pages/ClientDetail.tsx` | Change Creatives button to use `navigate()` instead of local state |
| `src/pages/PublicReport.tsx` | Change Creatives button to use `navigate()` |

---

## 2. Task Side Panel (Like Records)

### What You'll Get

Based on the reference image, tasks will open in a side panel (Sheet) similar to how records work, with:
- Slide-out panel from the right side
- Task details, status, assignees, files, and discussion
- **Copy Task URL button** - Copies a shareable link like `/client/:clientId/tasks/:taskId`

### Panel Layout

```text
┌─────────────────────────────────────┐
│  Task Title                   [X]   │
│  ─────────────────────────────────  │
│  Client: Blue Capital               │
│  Status: [To-Do ▼]                  │
│  Priority: [High ▼]                 │
│  Due: [Dec 15, 2024]                │
│  Assigned: [Team Member ▼]          │
│  ─────────────────────────────────  │
│  [📋 Copy Task URL]                 │
│  ─────────────────────────────────  │
│  Description                        │
│  Lorem ipsum...                     │
│  ─────────────────────────────────  │
│  📎 Attachments                     │
│  [file1.png] [file2.pdf]            │
│  ─────────────────────────────────  │
│  💬 Discussion                      │
│  ... comments timeline ...          │
└─────────────────────────────────────┘
```

### Task URL Structure

```text
Internal:  /client/:clientId/tasks/:taskId
Public:    /public/:token/tasks/:taskId
```

When a user navigates to these URLs:
1. The page loads the client/public report
2. Auto-opens the task panel for the specified task
3. Shows the full task details in the side panel

### Copy URL Behavior

- Click the copy icon → Copies the full task URL to clipboard
- Toast notification: "Task link copied to clipboard!"
- URL format: `https://funding-sonar.lovable.app/client/:clientId/tasks/:taskId`

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/tasks/TaskDetailPanel.tsx` | **NEW** - Sheet-based panel (converted from modal) |
| `src/components/tasks/KanbanBoard.tsx` | Open TaskDetailPanel instead of TaskDetailModal |
| `src/pages/ClientDetail.tsx` | Add route param handling for `?task=:taskId` |
| `src/pages/PublicReport.tsx` | Add route param handling for `?task=:taskId` |
| `src/App.tsx` | Add optional task routes |

---

## 3. Multi-Select Tasks for Bulk Actions

### What You'll Get

Based on the reference image showing checkboxes on task cards:
- Checkbox appears on hover (or always visible when in selection mode)
- Select multiple tasks across columns
- Floating action bar appears when tasks are selected
- Bulk actions: **Change Due Date** and **Delete**

### Selection Interface

```text
┌────────────────────────────────────────────────────┐
│  ☑ 3 tasks selected    [📅 Change Due Date] [🗑️ Delete]  │
└────────────────────────────────────────────────────┘
```

### Selection Behavior

| Action | Behavior |
|--------|----------|
| Click checkbox | Toggle task selection |
| Shift+Click | Select range (future enhancement) |
| Click outside | Keep selection (selection is explicit) |
| Escape key | Clear selection |
| Navigate away | Clear selection |

### Bulk Actions

**Change Due Date:**
1. Click "Change Due Date" button
2. Calendar popover opens
3. Select new date
4. All selected tasks update
5. Toast: "Updated due date for 3 tasks"

**Delete:**
1. Click "Delete" button
2. Confirmation dialog: "Delete 3 tasks? This cannot be undone."
3. Confirm → All selected tasks deleted
4. Toast: "Deleted 3 tasks"

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/tasks/KanbanBoard.tsx` | Add selection state, floating action bar |
| `src/components/tasks/KanbanTaskCard.tsx` | Add selection checkbox (persistent, not just hover) |
| `src/components/tasks/BulkActionBar.tsx` | **NEW** - Floating bar with bulk actions |
| `src/hooks/useTasks.ts` | Add `useBulkUpdateTasks` and `useBulkDeleteTasks` mutations |

---

## Technical Implementation Details

### New Components

**TaskDetailPanel.tsx** - Converts the existing modal to a Sheet:
```typescript
// Key differences from TaskDetailModal:
// - Uses Sheet instead of Dialog
// - Adds Copy URL button in header
// - Slides from right side
// - Maintains all existing functionality
```

**BulkActionBar.tsx** - Floating action bar:
```typescript
interface BulkActionBarProps {
  selectedCount: number;
  onChangeDueDate: (date: Date) => void;
  onDelete: () => void;
  onClearSelection: () => void;
}
```

### Database Considerations

No schema changes required - all features use existing `tasks` table structure.

### Bulk Operations (New Hooks)

```typescript
// useBulkUpdateTasks - Updates multiple tasks at once
await supabase
  .from('tasks')
  .update({ due_date: newDate })
  .in('id', taskIds);

// useBulkDeleteTasks - Deletes multiple tasks at once  
await supabase
  .from('tasks')
  .delete()
  .in('id', taskIds);
```

### URL Query Parameters

For deep-linking to specific tasks:
```text
/client/:clientId?tab=tasks&task=:taskId
/public/:token?section=tasks&task=:taskId
```

---

## Implementation Order

1. **Phase 1: Task Side Panel**
   - Create TaskDetailPanel (Sheet-based)
   - Add Copy URL functionality
   - Update KanbanBoard to use panel

2. **Phase 2: Multi-Select**
   - Add selection state to KanbanBoard
   - Update KanbanTaskCard with selection checkbox
   - Create BulkActionBar component
   - Add bulk mutation hooks

3. **Phase 3: Creatives Routes**
   - Create ClientCreatives page
   - Create PublicCreatives page
   - Update App.tsx with new routes
   - Update navigation in ClientDetail and PublicReport

---

## Summary

| Feature | Files Affected | Complexity |
|---------|---------------|------------|
| Creatives dedicated route | 5 files | Medium |
| Task side panel with URL copy | 4 files | Medium |
| Multi-select tasks | 4 files | Medium |
| **Total** | ~10 files | ~2-3 hours |

All features maintain existing design patterns, use existing UI components (Sheet, Checkbox, Badge), and follow the established code architecture.
