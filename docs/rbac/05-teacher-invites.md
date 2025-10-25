# Teacher Accounts via Admin Invites (No Public Signup)

Manual (temporary):
1) Authentication → Users → Add user (teacher email/password) or let them sign in with Google
2) Copy teacher UID
3) Firestore → users → Add document with that UID:
   - roles: ["teacher"], status: active, email: teacher@example.com, invitedBy: <admin UID>

Future invite flow (to implement):
1) Admin clicks “Create Invite”
2) Inputs: teacher email; role=teacher; expiration (e.g., 72 hours)
3) Create roleInvites/{inviteId} with fields:
   - email, role, invitedBy, status=pending, token=random, expiresAt
4) Email link: /auth/accept-invite?token=...
5) Accept flow verifies token → prompts sign in/sign up → link/create Auth user → users/{uid} roles += ["teacher"], status=active → mark invite accepted

Manual token generation (Windows PowerShell):
```cmd
powershell -Command "$b=New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); [Convert]::ToBase64String($b)"
```

