# Firebase Auth Setup (Console)

1) Navigate: Firebase Console → Build → Authentication → Get started

2) Enable providers:
- Google → Enable → set Project support email → Save
- Email/Password → Enable → keep Email link OFF (for now) → Save

3) Authorized domains:
- Authentication → Settings → Authorized domains
- Ensure localhost is present (add if missing)
- Add staging/production domains if known

4) Email templates (optional but recommended):
- Authentication → Templates → Email address verification
- Set From/Reply-To; customize the body

5) (Optional) Seed a test Parent user:
- Authentication → Users → Add user → email/password

Note: Record your Web app config from Project settings → General → Your apps (Web).

