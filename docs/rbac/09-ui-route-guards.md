# UI Route Guards — Planning Only

- Server-side checks per route (App Router):
  - /admin: require admin role; else redirect
  - /teacher: require teacher role; else redirect
  - /parent: require parent role; else redirect
- Unauthenticated users on protected routes → redirect to /signin

