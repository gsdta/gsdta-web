# Parent Signup Policy (Parents Only) ✅

## Implementation Status: COMPLETE

### Features Implemented:

1. **Signup Page** (`/signup`)
   - Google OAuth signup
   - Email/Password signup with password confirmation
   - Name field for new users
   - Email verification automatically sent for email/password signups
   - No Teacher/Admin options exposed (parent-only signup)
   - Links to signin page for existing users

2. **Auto-Profile Creation**
   - API endpoint `/api/v1/me` now auto-creates parent profiles on first sign-in
   - New users get: `roles: ["parent"]`, `status: "active"`
   - Name extracted from display name or email prefix
   - Logged for audit trail

3. **Email Verification**
   - Required for email/password signups
   - Verification email sent automatically during signup
   - Existing signin page shows verification banner if unverified
   - Users cannot access protected routes until verified

4. **Navigation Updates**
   - Header includes "Sign Up" link for anonymous users (both desktop and mobile)
   - Signin page includes link to signup page
   - All links work in Firebase auth mode only

### Files Modified:
- `api/src/lib/firestoreUsers.ts` - Added `createUserProfile()` function
- `api/src/app/v1/me/route.ts` - Auto-create parent profile on first sign-in
- `ui/src/app/signup/page.tsx` - New signup page (parent-only)
- `ui/src/app/signup/layout.tsx` - New signup layout
- `ui/src/app/signin/page.tsx` - Added link to signup page
- `ui/src/components/Header.tsx` - Added "Sign Up" navigation link

### Security:
- Only "parent" role assigned to self-signup users
- Teachers and Admins must be invited/seeded (per policies 03 & 05)
- Email verification enforced for email/password auth

### Future Enhancements (noted for later):
- Profile completion prompt for phone/address after first signin

