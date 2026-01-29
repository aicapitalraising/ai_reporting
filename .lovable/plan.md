

# Plan: Project Management System Enhancements

## Overview
This plan addresses comprehensive improvements to the task management system including inline editing, expanded discussion/activity tracking, task productivity metrics, multi-assignee support, and UI refinements for better usability.

---

## Changes Summary

### 1. Inline Editing in Task Detail Modal
**Goal**: Allow users to click directly on status, priority, due date, or description to edit them without entering a separate edit mode.

**Changes**:
- Remove the "Edit" button and `isEditing` state toggle pattern
- Each field becomes clickable/editable on demand:
  - **Status**: Click to show dropdown with all stages (To Do, Stuck, Review, Revisions, Completed)
  - **Priority**: Click to show dropdown (Low, Medium, High)
  - **Due Date**: Click to show calendar picker
  - **Description**: Click to switch to textarea, click away to save

**Technical Details**:
- Convert each field to an inline-editable component with `onClick` toggle
- Auto-save on change/blur using the existing `useUpdateTask` mutation
- Record history entries when values change

---

### 2. Task Detail Modal Layout Improvements
**Goal**: Remove collapsible "Hide task details" section and always show details at top with proper scrolling.

**Changes**:
- Remove `showDetails` state and collapsible trigger
- Task metadata (description, priority, status, due date, assignees) always visible in header section
- Add a scrollable area for the discussion/activity feed
- Files gallery stays between metadata and discussion

---

### 3. Enhanced Discussion Section with Full Activity History
**Goal**: Merge all task lifecycle events into a unified chronological timeline.

**New Activity Types**:
- Task created (with creator name and timestamp)
- Due date assigned/changed
- Status/stage changed
- Priority changed
- Assignee changed
- Task completed (with completion timestamp)
- File uploaded
- Comments (text and voice)

**Changes**:
- Automatically add history entries when:
  - Task is created (`action: 'created'`)
  - Any field changes (status, priority, due date, assignee)
  - Task is marked complete
  - Files are uploaded
- Show these in the discussion thread inline with comments
- Files uploaded via comment section will appear as history items

---

### 4. Status Options Update
**Goal**: Ensure status dropdown shows all workflow stages.

**Stage Options**:
- To Do (`todo`)
- Stuck (`stuck`)
- Review (`review`)
- Revisions (`revisions`)
- Completed (`done`)

**Changes**:
- Update status Select in TaskDetailModal to match Kanban stages
- Sync `status` field with `stage` field when changed

---

### 5. Multi-Assignee & Pod Assignment Support

**Database Migration**:
```sql
-- New junction table for multiple assignees
CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.agency_members(id) ON DELETE CASCADE,
  pod_id UUID REFERENCES public.agency_pods(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_assignee CHECK (member_id IS NOT NULL OR pod_id IS NOT NULL)
);

-- RLS policies
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view task_assignees" ON public.task_assignees FOR SELECT USING (true);
CREATE POLICY "Public can insert task_assignees" ON public.task_assignees FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete task_assignees" ON public.task_assignees FOR DELETE USING (true);
```

**Features**:
- Assign to one or multiple individual team members
- Assign to entire pod (all members in that pod)
- Clients can assign to a pod/group (e.g., "Creatives team")
- Agency sees individual names; clients see pod names only

**UI Changes**:
- Replace single-select with multi-select chip component
- Show pods as group options that can be selected
- Display assignees as avatars/chips on task cards

---

### 6. File Upload in Discussion Comments
**Goal**: Allow uploading files directly from the comment input area.

**Changes**:
- Add file attachment button next to voice note button in comment input
- When file is uploaded via discussion:
  - Add to `task_files` table
  - Create history entry showing "File uploaded: [filename] by [user]"
- File appears as both a thumbnail in files gallery and a history item in timeline

---

### 7. Creative Task File Previews
**Goal**: When creatives are auto-uploaded for review, ensure the file preview is visible in the task.

**Changes**:
- Ensure creative tasks auto-generated from uploads have the creative file linked as a task file
- Display image/video preview prominently in task detail for approval workflow
- Add approve/deny action buttons for creative review tasks

---

### 8. Logout Button Relocation
**Goal**: Move logout from floating top-right badge to next to theme toggle in DashboardHeader.

**Changes**:
- Remove floating logout badge from `PasswordGate.tsx`
- Pass `logout` function and `currentMember` down to `DashboardHeader`
- Add logout button after ThemeToggle showing member name with logout icon

---

### 9. Client Privacy for Discussion Authors
**Goal**: Clients see pod/team names instead of individual names in discussions.

**Changes**:
- When `isPublicView=true` in TaskDetailModal:
  - Comment authors show pod name (e.g., "Creatives Team") instead of individual name
  - Look up commenter's pod from `agency_members.pod_id`
  - Admins excluded (show as "Admin")
- Internal agency view continues showing individual names

---

### 10. Task Productivity Metrics on Dashboard
**Goal**: Add task analytics inline with Project Management section.

**Metrics to Display**:
1. **Average Time to Complete**: Mean days from `created_at` to `completed_at` (exclude automated tasks)
2. **Most Completions**: Team member who has completed the most tasks
3. **Most Created**: Team member who has created the most tasks (exclude automated)

**Implementation**:
- Create new `useTaskMetrics` hook to calculate:
  - Average completion time
  - Completion leaderboard
  - Creation leaderboard
- Display as inline stats next to "Project Management" title
- Filter by date range if active

---

### 11. Default Team Member View Filter
**Goal**: When logged in as a team member, default to showing only their tasks with option to view all.

**Changes**:
- In `KanbanBoard`, detect `currentMember` from context
- If team member is logged in, default `filterAssigneeId` to their ID
- Add toggle: "My Tasks" / "All Tasks"
- Remember preference in session

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| **Database Migration** | Create | Add `task_assignees` junction table |
| `src/hooks/useTasks.ts` | Modify | Add history recording on updates, add task assignees hooks |
| `src/hooks/useTaskMetrics.ts` | Create | Calculate avg completion time, leaderboards |
| `src/components/tasks/TaskDetailModal.tsx` | Modify | Inline editing, always-visible details, enhanced timeline, file upload in comments |
| `src/components/tasks/CreateTaskModal.tsx` | Modify | Multi-select for assignees and pods |
| `src/components/tasks/KanbanBoard.tsx` | Modify | Default to user's tasks, "My Tasks" toggle |
| `src/components/tasks/KanbanTaskCard.tsx` | Modify | Display multiple assignees |
| `src/components/tasks/TaskBoardView.tsx` | Modify | Add task metrics inline with header |
| `src/components/dashboard/DashboardHeader.tsx` | Modify | Add logout button next to theme toggle |
| `src/components/auth/PasswordGate.tsx` | Modify | Remove floating logout badge, pass context down |
| `src/pages/Index.tsx` | Modify | Pass logout props to header |

---

## Technical Considerations

### Inline Editing Pattern
Each editable field will follow this pattern:
```tsx
const [isEditingField, setIsEditingField] = useState(false);

// On click, show editable version
// On blur or change, auto-save and record history
const handleFieldChange = async (newValue) => {
  await addTaskHistory.mutateAsync({
    taskId: task.id,
    action: 'field_changed',
    oldValue: task.fieldName,
    newValue: newValue,
    changedBy: currentMember?.name,
  });
  await updateTask.mutateAsync({ id: task.id, fieldName: newValue });
};
```

### History-Aware Updates
The `useUpdateTask` hook will be enhanced to automatically record history for tracked fields (status, priority, due_date, assignees).

### Multi-Assignee Query Pattern
Tasks will be fetched with their assignees via a join:
```typescript
.select('*, assignees:task_assignees(*, member:agency_members(*), pod:agency_pods(*))')
```

---

## Implementation Order

1. Database migration for `task_assignees` table
2. Enhanced `useTasks` hooks with history recording and assignee support
3. `TaskDetailModal` - inline editing and always-visible layout
4. `TaskDetailModal` - enhanced discussion timeline with file upload
5. Multi-assignee UI in `CreateTaskModal` and `TaskDetailModal`
6. `KanbanBoard` - default to user's tasks toggle
7. Task metrics hook and display in `TaskBoardView`
8. Logout button relocation to header
9. Client privacy for author names in discussions

