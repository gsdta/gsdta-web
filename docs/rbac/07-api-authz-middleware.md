# Token Verification and Authorization (API) — Planning Only

- Use Firebase Admin SDK in API
- Middleware pipeline:
  1) Read Authorization: Bearer <idToken>
  2) Verify token via Admin SDK
  3) Fetch Firestore users/{uid}
  4) Attach req.user = { uid, email, roles, status }
  5) Enforce route-level guards

Local dev service account (later):
- GCP Console → IAM & Admin → Service Accounts → Create Service Account (e.g., gsdta-api)
- Grant roles: roles/datastore.user (for Firestore)
- (Only if needed) Firebase Auth Admin for user management
- Keys → Create key (JSON) for local only; set GOOGLE_APPLICATION_CREDENTIALS

