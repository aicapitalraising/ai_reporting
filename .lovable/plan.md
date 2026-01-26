

# Implementation Plan: Attribution Dashboard, Activity Feed & UI Fixes

## Summary

This plan adds three features to enhance the client dashboard:
1. **Attribution Dashboard** - A new visualization section showing which campaigns/ad sets drive the most leads, booked calls, showed calls, and funded investors
2. **Activity Feed** - A new section under Tasks showing all recent activity (task creation/completion, creative uploads/approvals/launches)
3. **Remove Duplicate Add Task Button** - Fix the UI showing two green "Add Task" buttons

---

## 1. Attribution Dashboard (Overview Section)

A new card component that aggregates leads data by `campaign_name` and `ad_set_name` to show performance breakdowns.

### What It Will Show

| Dimension | Leads | Booked Calls | Showed Calls | Funded Investors |
|-----------|-------|--------------|--------------|------------------|
| Campaign A | 45 | 28 | 22 | 8 |
| Campaign B | 32 | 18 | 14 | 5 |
| Ad Set 1 | 25 | 15 | 12 | 4 |

### Visual Design
- Toggle between **Campaign** and **Ad Set** and **ads** views
- Bar charts using Recharts (already installed)
- Table breakdown with sortable columns
- Positioned after the KPI Grid section in Overview

### Data Flow
- Uses existing `leads`, `calls`, and `fundedInvestors` data already fetched in `ClientDetail.tsx`
- Join calls to leads via `lead_id` to inherit campaign attribution
- Join funded investors to leads via `lead_id` for attribution

---

## 2. Activity Feed (Tasks Section)

A new tab or section in the Tasks view showing a timeline of all recent activity.

### Activity Types to Track
| Activity | Source | Display |
|----------|--------|---------|
| Task Created | `tasks.created_at` | "New task: {title}" |
| Task Completed | `tasks.completed_at` | "Task completed: {title}" |
| Creative Uploaded | `creatives.created_at` with status `pending` | "Creative uploaded: {title}" |
| Creative Approved | `creatives.updated_at` with status `approved` | "Creative approved: {title}" |
| Creative Launched | `creatives.updated_at` with status `launched` | "Creative launched: {title}" |

### Visual Design
- Timeline view with icons for each activity type
- Relative timestamps (e.g., "2 hours ago", "Yesterday")
- Filterable by activity type
- New tab in `TaskBoardView`: Summary | Kanban | **Activity**

### Data Flow
- Fetch tasks and creatives filtered by `client_id`
- Merge and sort by timestamp
- Display most recent 50 activities

---

## 3. Remove Duplicate Add Task Button

### Current Issue
The UI currently shows two "Add Task" buttons (as seen in the screenshot):
1. One in `TaskBoardView.tsx` (line 60-63) - in the card header
2. One in `KanbanBoard.tsx` (line 250-253) - in the toolbar

### Fix
Remove the duplicate button from `KanbanBoard.tsx` since the one in `TaskBoardView.tsx` header is sufficient and properly positioned.

---

## Technical Details

### New Component: `AttributionDashboard.tsx`

```text
src/components/dashboard/AttributionDashboard.tsx
```

**Props:**
- `leads: Lead[]`
- `calls: Call[]`
- `fundedInvestors: FundedInvestor[]`

**Features:**
- Aggregation logic to group by campaign/ad_set
- Bar chart visualization with Recharts
- Table with sortable columns
- Toggle between Campaign and Ad Set views

### New Component: `ActivityFeed.tsx`

```text
src/components/tasks/ActivityFeed.tsx
```

**Props:**
- `clientId: string`
- `tasks: Task[]`
- `creatives: Creative[]`

**Features:**
- Merge tasks and creatives into unified activity timeline
- Icons for different activity types (CheckCircle, Upload, Rocket, etc.)
- Relative time formatting using date-fns
- Scrollable list with load more

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/AttributionDashboard.tsx` | New component |
| `src/components/tasks/ActivityFeed.tsx` | New component |
| `src/pages/ClientDetail.tsx` | Add AttributionDashboard to Overview section |
| `src/pages/PublicReport.tsx` | Add AttributionDashboard to Overview section |
| `src/components/tasks/TaskBoardView.tsx` | Add Activity tab, fetch creatives |
| `src/components/tasks/KanbanBoard.tsx` | Remove duplicate "Add Task" button |

---

## Implementation Order

1. **Fix duplicate button** - Quick win, remove the extra button from `KanbanBoard.tsx`
2. **Create AttributionDashboard component** - Build the campaign/ad set breakdown visualization
3. **Add AttributionDashboard to Overview** - Integrate into both ClientDetail and PublicReport
4. **Create ActivityFeed component** - Build the activity timeline
5. **Integrate ActivityFeed into TaskBoardView** - Add as new view option

