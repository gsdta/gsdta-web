# Troubleshooting (Beginner-Friendly)

- I don’t see my project in Firebase Console
  - Create a Firebase project linked to your GCP project (Add Project → Use existing GCP project)
  - Ensure the correct Google account is selected

- Google provider “configuration incomplete”
  - Authentication → Sign-in method → Google → set Project support email

- Can’t add localhost to Authorized domains
  - Authentication → Settings → Authorized domains → Add domain: localhost

- Firestore “permission denied”
  - Production mode blocks public writes; authenticate and use verified tokens
  - For setup, create docs via Console first

- Forgot Admin’s UID
  - Authentication → Users → open user → copy UID

- Invite token not working (future flow)
  - roleInvites/{id}.status must be pending and not expired

- Email verification not received
  - Check spam; verify From/Reply-To in Authentication → Templates

