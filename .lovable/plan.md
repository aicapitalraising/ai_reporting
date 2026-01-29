

# One-Click Team Member Login

## Current Flow
```
[Master Password] → [Dropdown + Password Field + Hint] → Dashboard
```

## New Flow (Simplified)
```
[Master Password] → [Click Your Name] → Dashboard
```

## Visual Design

After the master password "HPA" is entered, users see a clean grid of team member names they can click to instantly log in:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    👤  Who's logging in?                    │
│                    Click your name to continue              │
│                                                             │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│     │   Zac    │  │   Gled   │  │   Emily  │               │
│     │  (admin) │  │          │  │  (admin) │               │
│     └──────────┘  └──────────┘  └──────────┘               │
│                                                             │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│     │   Bill   │  │  Flora   │  │  Louie   │               │
│     │          │  │          │  │          │               │
│     └──────────┘  └──────────┘  └──────────┘               │
│                                                             │
│                  ─────── or ───────                         │
│                                                             │
│               [ Skip - Continue as Guest ]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### File: `src/components/auth/TeamMemberLogin.tsx`

Replace the current dropdown/password form with a clickable name grid:

**Changes:**
1. Remove password field and dropdown
2. Display team members in a responsive grid of clickable cards/buttons
3. Each card shows the member's name (and optionally role badge for admins)
4. Clicking a card immediately calls `login()` and proceeds to dashboard
5. Keep "Skip" button for guest access
6. Show loading state while login is processing

```tsx
// New simplified component structure
export function TeamMemberLogin({ onSkip, onSuccess }: TeamMemberLoginProps) {
  const { data: members = [] } = useAgencyMembers();
  const { login } = useTeamMember();
  const [isLoggingIn, setIsLoggingIn] = useState<string | null>(null);

  const handleMemberClick = async (member: AgencyMember) => {
    setIsLoggingIn(member.id);
    try {
      await login({ id, name, email, role });
      toast.success(`Welcome back, ${member.name}!`);
      onSuccess();
    } catch (err) {
      toast.error('Failed to sign in');
    } finally {
      setIsLoggingIn(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <User icon />
        <CardTitle>Who's logging in?</CardTitle>
        <CardDescription>Click your name to continue</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Responsive grid of name buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {members.map(member => (
            <Button
              key={member.id}
              variant="outline"
              onClick={() => handleMemberClick(member)}
              disabled={!!isLoggingIn}
            >
              {member.name}
              {member.role === 'admin' && <Badge>Admin</Badge>}
            </Button>
          ))}
        </div>

        {/* Separator + Skip */}
        <div className="relative my-6">
          <Separator />
          <span>or</span>
        </div>

        <Button variant="ghost" onClick={onSkip}>
          Skip - Continue as Guest
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/auth/TeamMemberLogin.tsx` | Replace form with clickable name grid, remove password logic |

## Benefits

- **Faster access**: One click instead of dropdown → type password → submit
- **Visual**: See all team members at a glance
- **No password to remember**: Since master password already gates access
- **Mobile-friendly**: Large tap targets in a grid

