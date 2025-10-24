# RBAC Plan (Brainstorm Draft)

This is the master RBAC page. Each section has its own dedicated doc for easier navigation and collaboration. Start at the top and work down.

## Overview and decisions
- Parents-only signup; Teachers/Admins are invite/manual only
- Auth: Firebase Auth (Google + Email/Password)
- Store: Firestore (users, roleInvites)
- Sessions: Firebase client SDK (UI) + Firebase Admin SDK (API)
- Enforcement: API middleware + UI route guards

## Step-by-step plan
1. Project setup and prerequisites → [00-prereqs-project-setup.md](./rbac/00-prereqs-project-setup.md)
2. Firebase Auth setup (Console) → [01-auth-setup.md](./rbac/01-auth-setup.md)
3. Firestore initialization (Console) → [02-firestore-init.md](./rbac/02-firestore-init.md)
4. Seed the first Admin (manual) → [03-admin-seeding.md](./rbac/03-admin-seeding.md)
5. Parent signup policy (parents only) → [04-parent-signup-policy.md](./rbac/04-parent-signup-policy.md)
6. Teacher accounts via Admin invites → [05-teacher-invites.md](./rbac/05-teacher-invites.md)
7. Session handling (UI) → [06-session-handling-ui.md](./rbac/06-session-handling-ui.md)
8. Token verification and authorization (API) → [07-api-authz-middleware.md](./rbac/07-api-authz-middleware.md)
9. Minimal API endpoints → [08-api-surface.md](./rbac/08-api-surface.md)
10. UI route guards → [09-ui-route-guards.md](./rbac/09-ui-route-guards.md)
11. Security and policy hardening → [10-security-hardening.md](./rbac/10-security-hardening.md)
12. Operational procedures → [11-operations.md](./rbac/11-operations.md)
13. Testing plan → [12-testing-plan.md](./rbac/12-testing-plan.md)
14. Rollout milestones → [13-rollout-milestones.md](./rbac/13-rollout-milestones.md)
15. Sign-in implementation (UI + API) checklist → [14-signin-implementation-plan.md](./rbac/14-signin-implementation-plan.md)

## Supporting docs
- Troubleshooting → [troubleshooting.md](./rbac/troubleshooting.md)
- Glossary → [glossary.md](./rbac/glossary.md)
- Console click-path cheat sheet → [console-cheat-sheet.md](./rbac/console-cheat-sheet.md)
- Review checklist → [review-checklist.md](./rbac/review-checklist.md)

Notes
- These docs are planning/operations only—no application code included.
- When finalized, we’ll implement API contracts (/me, invites, accept-invite) and UI route guards.
