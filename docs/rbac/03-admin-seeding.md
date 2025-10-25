# Seed the First Admin (Manual; Project: YOUR_PROJECT_ID)

Goal: ensure at least one Admin user exists with roles: ["admin"]. We’ll do this entirely in the Firebase Console (no app code).

---

## 1) Create or confirm the Admin in Firebase Auth

1) Open https://console.firebase.google.com → select project: YOUR_PROJECT_ID
2) Build → Authentication → Users
3) If the Admin user already exists:
   - Click the user → copy the UID (you’ll use this in Firestore)
4) If the Admin user does not exist:
   - Click “Add user” → enter admin email (e.g., admin@example.com) and a temporary password → Add
   - Open the new user → copy the UID

Tip: If the Admin will use Google SSO, they can sign in once via your UI later; you can still copy their UID afterward.

---

## 2) Create the Firestore user document (users/{uid})

1) Build → Firestore Database → Data tab
2) Click Start collection (if `users` doesn’t exist) or select `users` if it already exists
3) Add document → Document ID: paste the UID you copied
4) Add fields (use exactly these names/types):
   - email (string): admin@example.com
   - name (string): Admin User
   - roles (array): ["admin"]
   - status (string): active
   - providers (array): ["google"] or ["password"] (choose what they’ll use)
   - invitedBy (string): leave empty (or omit) for Admin
   - createdAt / updatedAt: optional for now; you can add later when the app manages timestamps
5) Save

Why this matters: The API will look up users/{uid} to determine roles. Without this doc, the user won’t be treated as an Admin even if they can sign in.

---

## 3) Verify (later via app sign-in)

- After your UI sign-in flow is wired, the Admin should be able to sign in and land on /admin (dummy)
- Internally, the API will verify the token and read users/{uid}.roles = ["admin"]

For now, just confirm:
- Authentication → Users shows the admin email
- Firestore → users/{uid} has roles: ["admin"], status: active

---

## 4) Troubleshooting

- Can’t find the UID: Authentication → Users → click the user → copy UID from the details pane
- Wrong project: Double-check the project name in the top left of the Console (should be YOUR_PROJECT_ID)
- Missing users collection: Create it when adding the first document
- Multiple admins: Repeat these steps for each additional Admin user

---

## How to differentiate Admin users in the users list

Where to look
- Firebase Authentication → Users does not show roles (roles are stored in Firestore, not in Auth).
- Open Firestore Database → Data → `users` collection to see role data.

What to check
- Each user document includes a `roles` array and a `status` string.
- Admin users have: `roles` includes "admin" AND typically `status` = "active".

Filter in the Console
1) Firestore Database → Data → `users`
2) Click "Query" (or the query builder) and set:
   - Field: `roles`
   - Operator: array-contains
   - Value: `admin`
3) (Optional) Add a second order-by:
   - Order by: `updatedAt` DESC (if you store/update this field)

Notes
- This repo ships composite indexes to support queries like `roles array-contains 'admin'` ordered by `updatedAt` DESC. If the Console prompts for an index, wait a few minutes after deploying indexes.
- For non-Console checks (API later), the same logic applies: treat a user as admin if their Firestore users/{uid}.roles contains "admin" and status is "active".

---

## 5) What’s next

- Parent Signup Policy → `04-parent-signup-policy.md`
- Teacher Accounts via Admin Invites → `05-teacher-invites.md`
