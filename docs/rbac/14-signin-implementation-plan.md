# Sign-in Implementation Plan (UI + API) — Checklist

Purpose: Implement end-to-end sign-in with Firebase Auth on the client and RBAC enforcement on the server. Assumes Firestore has one user for each role (parent, teacher, admin) with status: "active".

Project context
- Project ID: playground-personal-474821 (region: us-central1)
- UI: Next.js (port 3000)
- API: Next.js API (port 8080)
- Firestore rules: users self-read/update (restricted), admin-only list; roleInvites admin-only

---

## 0) Prerequisites (confirm)
- [x] 00 — Prereqs & Project setup complete (project + billing + Firebase linked)
- [x] 01 — Auth providers enabled (Google + Email/Password); Authorized domains include localhost
- [x] 02 — Firestore DB created in us-central1; rules & indexes deployed from `persistence/`
- [x] 03 — Admin seeded in Auth + users/{uid} with roles: ["admin"], status: "active"

---

## 1) API contract and decisions
- [x] Define endpoint: GET `/api/v1/me`
  - [x] Request: Authorization: `Bearer <Firebase ID token>`
  - [x] 200: `{ uid, email, name?, roles: string[], status, emailVerified? }`
  - [x] Errors: 401 (missing/invalid token), 403 (status != active), 404 (no Firestore user), 500
  - Error response format (JSON): `{ code: string, message: string }` with appropriate HTTP status.
  - Examples:
    ```cmd
    curl -s -H "Authorization: Bearer <ID_TOKEN>" http://localhost:8080/api/v1/me
    ```
    - 200 OK:
      ```json
      {
        "uid": "abc123",
        "email": "user@example.com",
        "name": "A User",
        "roles": ["parent"],
        "status": "active",
        "emailVerified": true
      }
      ```
    - 401 Unauthorized (missing/invalid token):
      ```json
      { "code": "auth/unauthorized", "message": "Missing or invalid Authorization header" }
      ```
    - 403 Forbidden (status != active):
      ```json
      { "code": "auth/forbidden", "message": "User status is not active" }
      ```
    - 404 Not Found (no Firestore user):
      ```json
      { "code": "users/not-found", "message": "User profile not found" }
      ```
- [x] Decide email verification policy
  - [x] UI gates unverified email (show banner)
  - [ ] API returns 403 when `emailVerified=false` (choose one; default: UI gates)

---

## 2) API tasks (verify token + load user + RBAC)
- [x] Add Admin SDK init (idempotent)
  - [x] `api/src/lib/firebaseAdmin.ts` — initialize Admin app
  - [x] Local dev only: optional service account JSON (do not commit) — uses ADC if available
- [x] Add token verification helper
  - [x] `api/src/lib/auth.ts` — `verifyIdToken(authorizationHeader)` → `{ uid, email, emailVerified }`
- [x] Add Firestore user loader
  - [x] `api/src/lib/firestoreUsers.ts` — `getUserProfile(uid)` → sanitized `{ uid, email, roles, status, ... }`
- [x] Implement route handler
  - [x] `api/src/app/v1/me/route.ts` (GET)
  - [x] Verify token → load `users/{uid}` → check `status=='active'` → return 200
- [x] Dev CORS
  - [x] Allow Origin http://localhost:3000 for GET `/api/v1/me` (dev only; in production allow-list stays strict)
- [x] Logging (optional)
  - [x] Log request ID + uid; no tokens/PII in logs

---

## 3) UI tasks (client auth + role-based landing)
- [x] Firebase client init
  - [x] `ui/src/lib/firebase/client.ts` — initialize Web SDK using env
  - [x] Env in `ui/.env.local`:
    - [x] `NEXT_PUBLIC_FIREBASE_API_KEY=...`
    - [x] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=playground-personal-474821.firebaseapp.com`
    - [x] `NEXT_PUBLIC_FIREBASE_PROJECT_ID=playground-personal-474821`
    - [x] `NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...`
- [x] Auth helpers/hook
  - [x] Auth provider + hook implemented in `ui/src/components/AuthProvider.tsx` (manages auth state + ID token)
- [x] Sign-in page (/signin)
  - [x] Google sign-in button (popup/redirect)
  - [x] Email/Password form (sign-in)
  - [x] If provider is Email/Password and not `emailVerified`, show “verify email” banner
- [x] Call API and route by role
  - [x] After sign-in, call `/api/v1/me` with Authorization header
  - [x] Route: parent → `/parent`, teacher → `/teacher`, admin → `/admin`
- [x] Protected routes (dummy pages ok)
  - [x] `/parent` — require role parent
  - [x] `/teacher` — require role teacher
  - [x] `/admin` — require role admin
  - [x] Unauthed → `/signin`; mismatched role → redirect to allowed landing
- [x] Sign out
  - [x] Clear Firebase client session; redirect to `/signin`

---

## 4) Firestore rules alignment (sanity check)
- [ ] Users self can get their own doc; admin can list/get all
- [ ] Users self cannot change `roles`, `status`, `invitedBy`
- [ ] roleInvites collection is admin-only for all operations
- [ ] Re-deploy (if you changed rules):
  - [ ] `firebase deploy --project playground-personal-474821 --only firestore:rules`

---

## 5) Manual testing (happy + edge)
- [ ] Parent (Google) sign-in → `/parent` and `/api/v1/me` returns roles:[parent]
- [ ] Teacher (Google or email/password) → `/teacher`
- [ ] Admin (Google or email/password) → `/admin`
- [ ] Suspended user
  - [ ] Set `users/{uid}.status='suspended'` → `/api/v1/me` returns 403
- [ ] Unverified email (email/password)
  - [ ] Sign-in unverified account → UI shows verify banner, blocked from protected pages
- [ ] CORS (dev)
  - [ ] From UI (3000) to API (8080) `/api/v1/me` succeeds with Authorization header
- [ ] Token refresh
  - [ ] After some time, ensure `/api/v1/me` still works (Firebase refreshes ID token automatically)

---

## 6) Rollout and ops
- [ ] Add minimal observability (log request ID + uid)
- [ ] Update docs: link this plan from `rbac-plan.md`
- [ ] (Optional) Feature flag to disable sign-in quickly
- [ ] (Optional) Staging environment smoke tests

---

## 7) Nice-to-haves (later)
- [ ] Email verification resend on /signin when unverified
- [ ] UI banners for suspended users
- [ ] Remember-me or persist session options
- [ ] Better error handling and toasts
- [ ] Analytics (if desirable)

---

## Quick commands (reference)

API — dev CORS + rules re-deploy
```cmd
firebase deploy --project playground-personal-474821 --only firestore:rules
```

Indexes re-deploy (if needed)
```cmd
firebase deploy --project playground-personal-474821 --only firestore:indexes
```

Verify Firestore region and data
- Firebase Console → Firestore Database → Location: us-central1 → Data/Rules/Indexes

Auth providers (manual)
- Firebase Console → Authentication → Sign-in method → enable Google + Email/Password
- Firebase Console → Authentication → Settings → Authorized domains → add localhost
