# Review Checklist Before Implementation

- [ ] Project ID and billing configured
- [ ] Firebase enabled and Web app config saved
- [ ] Auth providers enabled: Google, Email/Password
- [ ] Authorized domains include localhost + staging/prod
- [ ] Firestore created with users and roleInvites collections
- [ ] First Admin seeded in Auth + users/{uid} with roles: ["admin"], status: active
- [ ] Parents-only signup confirmed (no Teacher/Admin visible in UI copy)
- [ ] Teacher/Admin are invite/manual only (policy documented)
- [ ] Invite TTL decided (e.g., 72 hours)
- [ ] Optional: allowed domains policy decided for teacher/admin invites
# Prerequisites and Project Setup

This guide helps you create a Google Cloud + Firebase project and capture the basics before any app code.

## Create a Google Cloud + Firebase project (one-time)

1) Create a Google account: https://accounts.google.com

2) Open Google Cloud Console: https://console.cloud.google.com

3) Create a new project:
- Click the project dropdown (top-left) → New Project
- Project name: e.g., gsdta-web
- Note the Project ID (e.g., gsdta-web-12345)

4) Attach billing:
- Left nav → Billing → Link a billing account
- If you don’t have one, follow prompts to set up billing

5) Enable Firebase on this GCP project:
- Go to https://firebase.google.com → Get started
- Click “Add project”, choose “Use an existing Google Cloud project”, select your project
- Accept terms and continue

6) Register a Web App (to get SDK config):
- Firebase Console → Project settings (gear) → General → Your apps → Web
- Register app name (e.g., gsdta-web-ui) → Register
- Copy the Web app config (apiKey, authDomain, projectId, appId)

Tip: Keep Project ID, Web app config, and any created UIDs in a secure shared doc.

## Prerequisites and decisions

- Project ID noted; billing enabled
- Domains identified: localhost for dev; plus staging/production
- Roles policy locked:
  - Parents: self-signup (Google or Email/Password)
  - Teachers: invite-only (created by Admin)
  - Admins: added manually (Auth + Firestore) by an existing Admin
- Data store: Firestore Native (same project)

