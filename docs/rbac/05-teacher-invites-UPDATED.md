# Teacher Accounts via Admin Invites (No Public Signup)

## Status: ✅ IMPLEMENTED

### Manual (temporary) method:
1) Authentication → Users → Add user (teacher email/password) or let them sign in with Google
2) Copy teacher UID
3) Firestore → users → Add document with that UID:
   - roles: ["teacher"], status: active, email: teacher@example.com, invitedBy: <admin UID>

### Automated Invite Flow (IMPLEMENTED):

**Admin creates invite:**
1) Admin navigates to `/admin`
2) Uses "Create Teacher Invite" form
3) Inputs: teacher email; role=teacher; expiration (default: 72 hours)
4) System creates roleInvites/{inviteId} with fields:
   - email, role, invitedBy, status=pending, token=random, expiresAt
5) Admin receives shareable invite link: `/invite/accept?token=...`

**Teacher accepts invite:**
1) Teacher clicks invite link
2) System verifies token is valid and not expired
3) Teacher signs in with Google (email must match invite)
4) System creates/updates users/{uid} with roles += ["teacher"], status=active
5) System marks invite as accepted
6) Teacher redirected to `/teacher` dashboard

### API Endpoints:

**POST /api/v1/invites** (Admin only)
- Creates new teacher invite
- Body: `{ email, role: "teacher", expiresInHours?: 72 }`
- Returns: invite object with token

**GET /api/v1/invites/verify?token=xxx** (Public)
- Verifies invite token validity
- Returns: invite details if valid and pending

**POST /api/v1/invites/accept** (Authenticated)
- Accepts invite for current user
- Body: `{ token }`
- Requires: signed-in user email matches invite email

### Implementation Files:

**API:**
- `/api/src/lib/roleInvites.ts` - Core invite logic
- `/api/src/lib/firestoreUsers.ts` - User profile management
- `/api/src/app/v1/invites/route.ts` - Create invite endpoint
- `/api/src/app/v1/invites/verify/route.ts` - Verify endpoint
- `/api/src/app/v1/invites/accept/route.ts` - Accept endpoint

**UI:**
- `/ui/src/components/TeacherInviteForm.tsx` - Admin form to create invites
- `/ui/src/app/admin/page.tsx` - Admin dashboard with invite form
- `/ui/src/app/invite/accept/page.tsx` - Teacher invite acceptance page

### Tests:

**Unit Tests:**
- `/api/src/lib/__tests__/roleInvites.test.ts` - Invite logic tests (✅ 15 tests)
- `/api/src/lib/__tests__/firestoreUsers.test.ts` - User profile tests (✅ 9 tests)
- `/ui/src/__tests__/TeacherInviteForm.test.tsx` - Form component tests (✅ 10 tests)
- `/ui/src/__tests__/invite-accept.page.test.tsx` - Accept page tests (✅ 8 tests)

**E2E Tests:**
- `/api/tests/e2e/features/teacher-invites.feature` - Cucumber scenarios (✅ 3 scenarios)
- `/ui/tests/e2e/teacher-invites.spec.ts` - Playwright tests (✅ 3 tests)

### Security Features:

- ✅ Only admins can create invites
- ✅ Tokens are cryptographically random (32 bytes, URL-safe base64)
- ✅ Invites expire (default 72 hours, max 720 hours)
- ✅ Email verification enforced on acceptance
- ✅ One-time use (marked accepted after use)
- ✅ CORS enabled for cross-origin requests
- ✅ Authentication required for acceptance

### Test Mode:

For E2E testing without Firestore, set `ALLOW_TEST_INVITES=1` environment variable.
Tokens starting with `test-` will return mock invite data.

Manual token generation (Windows PowerShell):
```cmd
powershell -Command "$b=New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); [Convert]::ToBase64String($b)"
```
