
# Implementation Plan: Task Due Dates, Team Sign-in & Activity Tracking, Public Link Passwords

This plan covers three feature requests:
1. **Auto-set task due dates** to two business days in the future
2. **Team member sign-in** with password = lowercase name and activity tracking
3. **Public link password protection** managed in client settings

---

## Feature 1: Automated Task Due Dates (Two Business Days)

### Overview
When new tasks are created, automatically set the due date to two business days from today unless the user explicitly picks a different date.

### Implementation Details

**1.1 Create Business Day Helper Function**
- Add a new utility function `addBusinessDays(date, days)` in `src/lib/utils.ts`
- This function skips weekends (Saturday/Sunday) when calculating the target date
- Example: Friday → Tuesday (skips Sat/Sun)

**1.2 Update CreateTaskModal.tsx**
- Initialize `dueDate` state with `addBusinessDays(new Date(), 2)` instead of `undefined`
- Add a `dueDateManuallySet` flag to track if user explicitly changed the date
- If user clears the date picker, keep the auto-calculated default
- Show "(auto)" indicator next to the date when it's the default value

**1.3 Update Other Task Creation Points**
- **useCreatives.ts**: When auto-creating review tasks, include due_date calculation
- **useMeetings.ts**: When converting meeting action items to tasks, add due_date

---

## Feature 2: Team Member Sign-in & Activity Tracking

### Overview
Enable team members to sign in using their name (password = lowercase version of their name), then track their activity including task creation.

### Implementation Details

**2.1 Database Schema Update**
Add a migration to extend `agency_members` table:
```sql
ALTER TABLE public.agency_members
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
```

Create a new activity log table:
```sql
CREATE TABLE public.member_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.agency_members(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**2.2 Create Team Member Login Component**
- New component: `src/components/auth/TeamMemberLogin.tsx`
- Provides a dropdown to select team member by name
- Password field validates against `memberName.toLowerCase()`
- On success, stores member info in sessionStorage:
  - `team_member_id`
  - `team_member_name`
- Creates a custom React context for current team member

**2.3 Create Team Member Context**
- New context: `src/contexts/TeamMemberContext.tsx`
- Provides `currentMember` state and `login/logout` functions
- Persists to sessionStorage for session continuity
- Updates `last_login_at` in database on login

**2.4 Update PasswordGate Component**
- After main dashboard password check passes, show team member login
- Make team login optional initially (can skip for anonymous access)
- When logged in, show member name in header with logout option

**2.5 Track Activity on Task Creation**
- Update `useCreateTask` mutation to:
  - Set `created_by` field to current team member name
  - Insert record into `member_activity_log` table
- Update `CreateTaskModal` to pass current member context

**2.6 Activity Feed Enhancement**
- Update `ActivityFeed.tsx` to show who created each task
- Display member name badge next to task activities
- Add "My Activity" filter option for logged-in members

---

## Feature 3: Public Link Password Protection

### Overview
Add an optional password field in client settings that protects the public shareable link.

### Implementation Details

**3.1 Database Schema Update**
Add password field to `client_settings`:
```sql
ALTER TABLE public.client_settings
ADD COLUMN IF NOT EXISTS public_link_password TEXT;
```

**3.2 Update ClientSettings Interface**
- Add `public_link_password?: string` to the TypeScript interface in `useClientSettings.ts`

**3.3 Update ClientSettingsModal.tsx**
- Add new section under a "Security" or within existing tabs
- Include:
  - Password input field (with show/hide toggle)
  - "Enable password protection" switch
  - Help text explaining this protects the public link
- Save password to `client_settings` table

**3.4 Update PublicReport.tsx**
- Fetch client settings to check if `public_link_password` is set
- If password is set, show a password gate before rendering the report
- Create a simple password form similar to main PasswordGate but client-specific
- Store auth state in sessionStorage with client-specific key: `public_auth_{clientId}`

---

## Technical Summary

| Component | Changes |
|-----------|---------|
| `src/lib/utils.ts` | Add `addBusinessDays()` helper |
| `src/components/tasks/CreateTaskModal.tsx` | Auto-set due date, add created_by |
| `src/hooks/useCreatives.ts` | Add due_date to auto-created tasks |
| `src/hooks/useMeetings.ts` | Add due_date to meeting tasks |
| `src/contexts/TeamMemberContext.tsx` | New context for member session |
| `src/components/auth/TeamMemberLogin.tsx` | New login component |
| `src/components/auth/PasswordGate.tsx` | Integrate team member login |
| `src/hooks/useTasks.ts` | Update to track created_by and log activity |
| `src/hooks/useClientSettings.ts` | Add public_link_password field |
| `src/components/settings/ClientSettingsModal.tsx` | Add password config UI |
| `src/pages/PublicReport.tsx` | Add password protection check |
| `supabase/migrations/` | Schema updates for activity log and password fields |

---

## User Experience Flow

### Task Creation
1. User opens "Create Task" modal
2. Due date is pre-filled with date 2 business days from today
3. User can override by picking a different date
4. If logged in as team member, their name is recorded as creator

### Team Member Login
1. After entering "HPA" password, a secondary step appears
2. User selects their name from dropdown
3. Enters password (their name in lowercase, e.g., "john doe" → "john doe")
4. On success, their name appears in the header
5. All their task creations are attributed to them

### Public Link Password
1. Agency goes to Client Settings → adds password for public link
2. When clients visit the public URL, they see a password prompt
3. After entering correct password, they access the dashboard
4. Session persists in browser until cleared
