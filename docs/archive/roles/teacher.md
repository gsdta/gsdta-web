# Teacher Role

Last updated: 2025-11-02

Teachers gain access via an invitation issued by an Admin. After accepting the invite, teachers are routed to the teacher experience in the UI.

Highlights
- Onboarding: invite-only. A unique token is emailed or shared out-of-band.
- Acceptance: user must sign in and the signed-in email must match the invite email.
- Routing: UI routes teachers to `/teacher` once the role is present.

Invite flow
- Verify invite (public)
  - `GET /api/v1/invites/verify?token=...`
  - Returns invite details when usable (`id`, `email`, `role`, `status`, `expiresAt`).
  - Rate limited: 20 requests/min/IP. Test mode accepts `test-*` tokens.
- Accept invite (authenticated)
  - `POST /api/v1/invites/accept` with body `{ token }`
  - Requires Firebase ID token and matching email.
  - Adds the invited role and marks the invite accepted.
  - Blocks users whose profile status is not `active`.
  - Rate limited: 10 requests/min/IP.

Authentication and session
- Mock mode (local/test): role can be simulated in the UI. E2E tests verify the verification page and invalid-token behaviors.
- Firebase mode: sign in with Google/Email. UI calls `/api/v1/me` to resolve roles/status and route accordingly.

Future
- Build out the teacher dashboard and workflows (class rosters, materials, etc.).

