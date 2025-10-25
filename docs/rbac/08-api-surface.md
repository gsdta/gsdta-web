# Minimal API Endpoints — Planning Only

- GET /api/v1/me (auth required)
  - Returns users/{uid} profile including roles and status

- POST /api/v1/admin/invites (admin only)
  - Creates roleInvites/{id} (teacher/admin)

- POST /api/v1/auth/accept-invite
  - Accepts invite token, links/creates Auth user, updates role

- Later: admin user management (list/search, role changes)

