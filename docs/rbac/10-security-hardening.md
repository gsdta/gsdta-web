# Security and Policy Hardening

- Require email verification for Email/Password users before access
- Rate-limit invite acceptance attempts (e.g., 5/hour per IP)
- Store minimal PII; do not log tokens/PII
- Set invite TTL (e.g., 72 hours); plan cleanup job for expired invites
- (Optional) Restrict teacher/admin invites to specific email domains

