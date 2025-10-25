# Firestore Initialization (Project: YOUR_PROJECT_ID)

Goal: create/verify a Firestore database for this project, create base collections, deploy our repo’s rules and indexes, and verify everything—without writing any app code.

---

## 1) Create or verify the Firestore database (CLI)

Create a Firestore (Native mode) database in us-central1. If it already exists, the command will say so—you can continue.

```cmd
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud firestore databases create ^
  --location=us-central1 ^
  --type=firestore-native
```

Why this matters: Firestore must exist in your chosen region before you can add data, rules, or indexes.

---

## 2) Create base collections (Console)

Use the Firebase Console to create the initial empty collections we’ll use:

1) Open https://console.firebase.google.com → select project: YOUR_PROJECT_ID
2) Build → Firestore Database → Data tab
3) Click “Start collection” and create:
   - Collection ID: `users`
   - Add no fields yet (click Save with an empty doc or delete the auto-created doc afterward)
4) Click “Start collection” again and create:
   - Collection ID: `roleInvites`
   - Same note about fields/docs

Why this matters: Collections appear after first document is created. Creating an empty placeholder doc is fine; we’ll manage real data later in Admin Seeding (03).

---

## 3) Deploy Firestore rules and indexes from this repo

We keep rules and indexes under `persistence/`. Deploy them using the Firebase CLI.

```cmd
:: From the repo root (contains firebase.json pointing to persistence/*)
npm install -g firebase-tools
firebase login

:: Deploy only Firestore rules and indexes to this project
firebase deploy --project YOUR_PROJECT_ID --only firestore:rules
firebase deploy --project YOUR_PROJECT_ID --only firestore:indexes
```

Notes
- The repo’s `firebase.json` already points to `persistence/firestore.rules` and `persistence/firestore.indexes.json`.
- If you change rules/indexes later, re-run the two deploy commands above.

---

## 4) Verify rules and indexes

- Console → Firestore Database → Rules tab: confirm your rules are active
- Console → Firestore Database → Indexes tab: confirm composite indexes show as Ready (they can take a few minutes)
- Console → Firestore Database → Data tab: confirm `users` and `roleInvites` appear (even if empty)

---

## 5) Optional: run a local Firestore emulator

If you want a local dev DB (not required right now):

```cmd
npm install -g firebase-tools
firebase login

:: Start only the Firestore emulator (default ports defined in firebase.json)
firebase emulators:start --only firestore
```

Emulator UI: http://localhost:4445

Tip: Your app will need to point to the emulator (e.g., FIRESTORE_EMULATOR_HOST=127.0.0.1:8889) when you choose to wire it up. For now, this is optional.

---

## 6) Troubleshooting

- “PERMISSION_DENIED” in Console writes: Production mode blocks unauthenticated writes unless your rules allow them. Use the Console to create initial docs or deploy rules that allow the operation.
- Index not showing as Ready: Composite indexes can take several minutes. Refresh the Indexes tab.
- Deploy says “Nothing to deploy”: Ensure you’re in the repo root where `firebase.json` exists.
- Wrong project: Check the banner in the Firebase Console and the `--project YOUR_PROJECT_ID` flag in commands.

---

## 7) What’s next

Proceed to Admin Seeding → `03-admin-seeding.md` to add your first Admin user document and verify access flows.
