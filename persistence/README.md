# Persistence (Firestore)

This package holds Firestore security rules and index definitions.

## Contents
- `firestore.rules` — Firestore security rules
- `firestore.indexes.json` — Composite indexes

## Quick start
Deploy rules and indexes using Firebase CLI:

```cmd
firebase deploy --project <YOUR_PROJECT_ID> --only firestore:rules
firebase deploy --project <YOUR_PROJECT_ID> --only firestore:indexes
```

## Docs
- Infra and deployment: `../docs/infra.md`, `../docs/gcp-deploy.md`
- Features overview: `../docs/features.md`

