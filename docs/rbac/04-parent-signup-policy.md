# Parent Signup Policy (Parents Only)

- Allow Parents to sign up via Google or Email/Password
- Do NOT expose Teacher/Admin options on signup screens
- Email/Password requires email verification before accessing protected areas

First sign-in behavior (to implement later):
- If users/{uid} does not exist, create it with:
  - roles: ["parent"], status: active
  - email, name from Auth displayName
- Prompt for phone/address in profile-completion

