# Session Handling (UI) — Planning Only

- Use Firebase Web SDK
- On app start:
  - Initialize with Web app config
  - Listen to onAuthStateChanged
  - When signed in, get ID token (Authorization: Bearer <token>) for API calls
- Role-based landing (dummy):
  - Call GET /api/v1/me; route: parent→/parent, admin→/admin, teacher→/teacher, else→/
- Email verification: block sensitive routes for unverified email/password users

