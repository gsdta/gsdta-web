# Operational Procedures (Manual v1)

- Add a new Admin manually:
  1) Create/find Auth user → copy UID
  2) Firestore → users/{uid} → set roles to include "admin", status="active"

- Suspend a user:
  1) Firestore → users/{uid}.status = "suspended"
  2) API denies access when status != "active"

- Audit invites/role changes:
  - Set invitedBy on users and roleInvites; keep updatedAt current

