# Parent Role

Last updated: 2025-11-02

Parents can access public content and, after sign-in, parent-specific pages. Parent is also the default role for a first-time user created at sign-in per policy.

Highlights
- Signup: allowed (policy). First sign-in auto-creates a parent profile in Firestore.
- Routing: UI routes parents to `/parent` after sign-in.
- Access: public site pages and parent area (as implemented).

Authentication and session
- Mock mode (local/test): role selected via UI mock and persisted in session.
- Firebase mode: sign in with Google or Email/Password; UI fetches `/api/v1/me` to resolve roles/status.

Relevant API
- `GET /api/v1/me` — returns uid, email, roles, status, emailVerified.

Notes
- Email verification can be required (policy) for sensitive operations.
- Future expansions may include parent-specific workflows (registration, payments).

