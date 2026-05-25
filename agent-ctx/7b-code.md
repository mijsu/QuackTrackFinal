# Task 7b - Fix missing 'viewFaculty' action

## Summary
Fixed the missing `viewFaculty` action in `/home/z/my-project/src/lib/roles.ts` that prevented the "Manage Faculty" quick action button from showing on the dashboard.

## Changes Made

### 1. Added `viewFaculty` to ACTION_PERMISSIONS (roles.ts line 79)
```typescript
viewFaculty:       ['admin', 'department_dean', 'program_head', 'human_resource'],
```

### 2. Updated VIEW_ACCESS for `faculty` view (roles.ts line 53)
Changed from `['admin', 'human_resource']` to `['admin', 'department_dean', 'program_head', 'human_resource']`

This was necessary for consistency — without it, the `viewFaculty` action would show the "Manage Faculty" button for department_dean and program_head, but clicking it would navigate to a view they couldn't access via `canAccessView()`.

## Verification
- `bun run lint` passed with no errors
- Dev server recompiled successfully
