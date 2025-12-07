# Admin Role

Last updated: 2025-11-02

Admins manage teacher invitations and have elevated privileges for operational tasks.

Highlights
- Onboarding: seeded manually for the first admin; subsequent admins can be granted via Firestore or future UI.
- Capabilities: create teacher invites; perform operational updates (suspend users, etc.).
- Routing: UI routes admins to `/admin` once the role is present.

Invite management
- Create invite (admin-only)
  - `POST /api/v1/invites` with `{ email, role? = 'teacher', expiresInHours? }`
  - Requires admin role via `Authorization: Bearer <idToken>`.
  - Rate limited: 30 requests/hour/IP.
- Verify and accept endpoints are shared with teacher flow.

Security
- API enforces token verification and role checks via a reusable guard.
- CORS allow-list is enforced; rate limiting is applied to invite endpoints.

Operations (manual v1)
- Seed first admin: create Auth user, then set Firestore `users/{uid}` roles to include `admin` and `status='active'`.
- Suspend user: set `users/{uid}.status='suspended'`.

Future
- Admin UI for invite lifecycle, user search, and role management.

