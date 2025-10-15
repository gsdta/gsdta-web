# Deploying gsdta-api

This repo includes two GitHub Actions workflows:

- CI (`.github/workflows/ci.yml`): Lint, test, and build the Docker image on every push/PR.
- Deploy (`.github/workflows/deploy.yml`): Build and push an image to GHCR, then deploy it to a remote host over SSH
  using secrets-provided environment variables.

The application reads configuration from process environment (no `.env` file needed in production). You provide all
runtime configuration via GitHub Secrets and the deploy workflow passes them to the container at runtime.

## 1) Container image registry

- Images are pushed to GitHub Container Registry (GHCR) under `ghcr.io/<owner>/<repo>`.
- The build job uses the default `GITHUB_TOKEN` (provided automatically by GitHub Actions) to push images.
- The remote host must be able to pull from GHCR; we log in there using `GHCR_USERNAME` + `GHCR_TOKEN` secrets.

Permissions for `GHCR_TOKEN`:

- A GitHub Personal Access Token (classic) with `read:packages` scope (and optionally `repo` if your org requires it).
  See https://ghcr.io docs.

## 2) Required GitHub Secrets

Set these at the repository level in GitHub: Settings → Secrets and variables → Actions → New repository secret.

Secrets for remote deployment (SSH):

- `PROD_SSH_HOST`: Public hostname or IP of the Linux host (e.g., `api.example.com`).
- `PROD_SSH_USER`: SSH username (e.g., `ubuntu`, `ec2-user`, `root`, or a non-root user with Docker permissions).
- `PROD_SSH_KEY`: Private SSH key contents for the user above (PEM/OPENSSH format). Paste as-is; do not base64-encode.
- `PROD_SSH_PORT` (optional): SSH port; defaults to `22` if not provided.

Secrets for container image pull on the remote host (GHCR):

- `GHCR_USERNAME`: GitHub username or org that owns the GHCR namespace.
- `GHCR_TOKEN`: Personal Access Token with `read:packages` scope to `docker login ghcr.io`.

Secrets for runtime application configuration (passed as `-e` envs to `docker run`):

- `PROD_APP_PORT`: Host port to expose the API (mapped to container `8080`), e.g., `8080`.
- `PROD_APP_ENV` (optional): Defaults to `production`.
- `PROD_LOG_LEVEL` (optional): Defaults to `info`.
- `PROD_CORS_ALLOWED_ORIGINS`: Comma-separated origins allowed for CORS (e.g., `https://app.example.com`).
- `PROD_DATABASE_URL`: Postgres connection string; required to use the Postgres store (e.g.,
  `postgres://user:pass@db-host:5432/gsdta?sslmode=disable`).
- `PROD_MIGRATE_ON_START` (optional): `false` recommended in prod. Use migrations/ops to manage schema. If `true`, the
  container will attempt to apply `/app/gsdta.sql` at startup.
- `PROD_SEED_ON_START` (optional): `false` in prod (seeding is intended for in-memory dev only).

Notes:

- The `GITHUB_TOKEN` used by the build job is automatically provided; you do not need to set it.
- If your remote host cannot reach GHCR without a proxy or firewall rule, open outbound access to `ghcr.io`.

## 3) Deploy workflow behavior

The Deploy workflow (`deploy.yml`) runs on:

- Pushes to `main` (automatic), or
- Manual trigger from the Actions tab (`workflow_dispatch`).

Steps:

1. Build and push a Docker image to GHCR with tags:
    - `latest` on the default branch
    - The commit SHA (`sha`) tag
2. SSH into the remote host and run:
    - `docker login ghcr.io` using `GHCR_USERNAME` and `GHCR_TOKEN`
    - `docker pull ghcr.io/<owner>/<repo>:<sha>`
    - Stop/remove any existing container named `gsdta-api`
    - `docker run -d --restart=always --name gsdta-api -p <PROD_APP_PORT>:8080` with envs from secrets

Container envs used at runtime:

- `APP_ENV`, `PORT`, `LOG_LEVEL`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, `MIGRATE_ON_START`, `SEED_ON_START`
- The container exposes 8080 by default and uses non-root user.

## 4) Preparing the remote host

- Install Docker Engine and ensure your deploy user can run Docker (add to `docker` group on many distros).
- Add the public key corresponding to `PROD_SSH_KEY` to the remote host `~/.ssh/authorized_keys` for `PROD_SSH_USER`.
- Open inbound firewall to `PROD_APP_PORT` from your load balancer or clients.
- Optional: Set up a reverse proxy (nginx/traefik/Caddy) to manage TLS and map domain names to the container.

## 5) Application configuration refresher

The app uses Postgres when `DATABASE_URL` is set; otherwise, it falls back to an in-memory store (for dev/testing).
Recommended production env:

- `APP_ENV=production`
- `PORT=8080` (internal container port)
- `LOG_LEVEL=info`
- `CORS_ALLOWED_ORIGINS=https://your-frontend.example.com`
- `DATABASE_URL=postgres://user:pass@db-host:5432/gsdta?sslmode=disable`
- `MIGRATE_ON_START=false`
- `SEED_ON_START=false`

If you need an initial schema in a new DB, use your DB migration process or temporarily set `MIGRATE_ON_START=true` (dev
convenience only). The image includes `/app/gsdta.sql`.

## 6) Manual checks and troubleshooting

On the remote host:

- See logs:
  ```sh
  docker logs -f gsdta-api
  ```
- Inspect running container envs and config:
  ```sh
  docker inspect gsdta-api
  ```
- Verify it’s listening:
  ```sh
  curl -sSf http://localhost:8080/healthz
  curl -sSf http://localhost:8080/v1/version
  ```
- If the container fails to start, ensure `DATABASE_URL` is reachable and correct. Check network and security groups.

## 7) Changing image registry or deployment approach

- If you prefer another registry (e.g., Docker Hub, ECR, GCR):
    - Update `IMAGE_NAME` and the login/push steps in `.github/workflows/deploy.yml`.
    - Replace `GHCR_*` secrets with your provider’s credentials.
- For Kubernetes deployments, use these secrets in your cluster’s Secret/ConfigMap and adjust your manifests
  accordingly (see `docs/infra.md` if present, or create a deployment spec).

## 8) Google Cloud (optional): Artifact Registry + Cloud Run

You can deploy the same container to Google Cloud Run and use Artifact Registry for images. The workflow includes a
commented job named `gcp-deploy` in `.github/workflows/deploy.yml`. To use it, uncomment that job and (optionally)
comment out the `deploy-ssh` job.

Required Google Cloud setup:

- Create or choose a project and note the `PROJECT_ID`.
- Enable APIs: `Artifact Registry API`, `Cloud Run Admin API`, and if needed for networking/DB access, `VPC Access API`
  and/or `Cloud SQL Admin API`.
- Create an Artifact Registry Docker repository (regional), e.g., name `gsdta`, format `Docker`, region `us-central1`.
- Create a service account for CI/CD (e.g., `github-actions-deployer`). Grant these roles:
    - `roles/artifactregistry.writer` (push images to Artifact Registry)
    - `roles/run.admin` (deploy/manage Cloud Run)
    - `roles/iam.serviceAccountUser` (allow the deploy action to use the SA)

Authentication from GitHub Actions (choose one):

- Simpler (JSON key): create a key for the service account and add its JSON to the GitHub secret `GCP_SA_KEY`.
- Preferred (no long-lived key): set up Workload Identity Federation and add secrets:
    - `GCP_WORKLOAD_IDENTITY_PROVIDER`: full resource name of the provider
    - `GCP_SERVICE_ACCOUNT`: the service account email (e.g.,
      `github-actions-deployer@<PROJECT_ID>.iam.gserviceaccount.com`)

Add these GitHub Actions secrets for the GCP job:

- `GCP_PROJECT_ID`: your GCP project ID
- `GCP_REGION`: region for Artifact Registry and Cloud Run (e.g., `us-central1`)
- `GCP_ARTIFACT_REPO`: Artifact Registry repo name (e.g., `gsdta`)
- One of:
    - `GCP_SA_KEY` (JSON) for key-based auth, or
    - `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT` for WIF

Runtime application secrets (reused):

- `PROD_APP_ENV`, `PROD_LOG_LEVEL`, `PROD_CORS_ALLOWED_ORIGINS`, `PROD_DATABASE_URL`, `PROD_MIGRATE_ON_START`,
  `PROD_SEED_ON_START`

What the Cloud Run job does (once enabled):

1. Authenticates to Google Cloud using the provided method.
2. Configures Docker to push to Artifact Registry (`<region>-docker.pkg.dev`).
3. Builds and pushes an image tag `${{ github.sha }}` to `ARTIFACT_REPO` as `SERVICE_NAME`.
4. Deploys/revises a Cloud Run service named `gsdta-api` in `GCP_REGION` with env vars and port 8080.

Notes on database access from Cloud Run:

- If your Postgres is publicly reachable, ensure the correct firewall rules and use a standard connection string in
  `PROD_DATABASE_URL`.
- For Cloud SQL:
    - Public IP: you can use the Cloud SQL Auth Proxy sidecar or add the connection info to the connection string.
    - Private IP: configure a Serverless VPC Access connector and attach it to Cloud Run. This requires additional
      flags (e.g., `--vpc-connector`) in the deploy step; you can extend the commented flags in the workflow
      accordingly.

Verification on Cloud Run:

- After deploy, the job output prints the service URL. Test:
  ```sh
  curl -sSf https://<your-cloud-run-url>/healthz
  curl -sSf https://<your-cloud-run-url>/v1/version
  ```

Rollback:

- Cloud Run keeps revisions. You can redeploy an older image tag or roll back via the Cloud Console → Cloud Run →
  Revisions.
