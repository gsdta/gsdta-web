# Testing Plan (No App Code Yet)

Prepare test accounts:
- parent1@example.com (Email/Password)
- parent-google (Google SSO)
- teacher1@example.com (invite)
- admin1@example.com (seeded manually)

Scenarios:
- Parent signup/signin → lands on /parent (dummy)
- Email/password parent blocked until verified
- Admin manually creates teacher in Auth + users doc → /teacher (dummy)
- Create roleInvites doc with token → simulate acceptance
- Guest cannot access protected routes

Later: add Playwright E2E for signin, route guards, invite acceptance

