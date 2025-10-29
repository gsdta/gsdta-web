# GitHub Actions Service Account – Secret Manager Access

The deploy workflow (`.github/workflows/deploy.yml`) authenticates to Google Cloud with the `gsdta-web-ci` service account. Existing setup docs (`docs/gcp-deploy.md`, `docs/cloud-run-env-vars.md`) grant it the following project roles:

- `roles/artifactregistry.writer`
- `roles/run.admin`
- `roles/iam.serviceAccountUser`

Those roles are sufficient for building and deploying to Cloud Run but **do not** allow the workflow to read Firebase configuration that lives in Secret Manager. When the workflow reaches the step that fetches `FIREBASE_*` secrets, it fails with `One or more Firebase secrets are empty` because the service account cannot access them.

Grant the missing Secret Manager role with the commands below. They bind the `roles/secretmanager.secretAccessor` role at the project level so the workflow can read all Firebase secrets that live in `YOUR_PROJECT_ID`.

```bash
PROJECT_ID="YOUR_PROJECT_ID"
SA_EMAIL="gsdta-web-ci@${PROJECT_ID}.iam.gserviceaccount.com"

# Allow the GitHub Actions service account to read secrets in the project
# (covers FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_APP_ID, etc.)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Optional: confirm the role is now listed for the service account
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten="bindings[]" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}" \
  --format="table(bindings.role)"
```

If you prefer to scope access to individual secrets instead of the entire project, repeat `gcloud secrets add-iam-policy-binding` for each Firebase secret and use `--member serviceAccount:${SA_EMAIL}` with the same role.
