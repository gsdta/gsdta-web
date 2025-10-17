# GitHub Actions Configuration

This document describes the CI/CD workflows configured for this project.

## Overview

The project uses two separate GitHub Actions workflows:

1. **CI Workflow** (`ci.yml`) - Runs on the `develop` branch
2. **Deploy Workflow** (`deploy.yml`) - Runs on the `main` branch

**Important**: No workflows run when pull requests are created. This keeps the CI/CD pipeline clean and focused on integrated code.

## CI Workflow

**File**: `.github/workflows/ci.yml`

**Triggers**: 
- Push to `develop` branch
- Ignores documentation files (`*.md`, `*.mdx`, `*.txt`, `docs/**`)

**Purpose**: Build and test the application when code is merged to the develop branch.

### Jobs

#### build-and-test
Single job that performs all build and test operations sequentially:

1. **Setup**: Checkout code, setup Node.js 20 and Go 1.21 with caching
2. **API Steps**:
   - Download Go dependencies
   - Lint code with golangci-lint
   - Run tests with race detection and coverage
   - Build the API binary with version metadata
3. **UI Steps**:
   - Install npm dependencies
   - Lint with ESLint
   - Type check with TypeScript
   - Run unit tests
   - Build Next.js application (standalone server output)

**Failure Behavior**: Any step failure stops the workflow. If linting, tests, or build fails, the workflow is marked as failed.

## Deploy Workflow

**File**: `.github/workflows/deploy.yml`

**Triggers**:
- Push to `main` branch
- Manual workflow dispatch (with configurable options)

**Purpose**: Build, test, and deploy the application to Google Cloud Platform when code is merged to main.

### Jobs

The deploy workflow consists of 4 stages that run sequentially:

#### 1. Build Stage
**Job**: `build`

Verifies that the code compiles successfully:

- Checkout code
- Setup Node.js 20 and Go 1.21 with caching
- Download Go dependencies and build API binary
- Install npm dependencies and build Next.js UI

**Failure Behavior**: If build fails, workflow stops here. Test and deploy stages are skipped.

#### 2. Test Stage
**Job**: `test` (runs only if `build` succeeds)

Runs comprehensive quality checks and tests:

- **API Testing**:
  - Download dependencies
  - Lint with golangci-lint
  - Run Go tests with race detection and coverage
  
- **UI Testing**:
  - Install dependencies
  - Lint with ESLint
  - Type check with TypeScript
  - Run unit tests in CI mode

**Failure Behavior**: If any test or lint check fails, workflow stops here. Deploy stage is skipped.

#### 3. Deploy Stage
**Job**: `deploy` (runs only if `build` and `test` succeed)

Builds Docker image and deploys to Google Cloud Run:

- Setup Node.js and Go
- Authenticate with Google Cloud using service account credentials
- Setup gcloud CLI
- Compute image metadata (version, commit SHA, build time)
- Setup Docker Buildx
- Authenticate Docker to Google Artifact Registry
- Build multi-stage Docker image with build arguments
- Push image to Artifact Registry
- Deploy to Cloud Run with environment variables

**Configuration**:
- **Project ID**: `YOUR_PROJECT_ID`
- **Region**: `us-central1`
- **Artifact Registry**: `web-apps`
- **Service Name**: `gsdta-web`
- **Port**: 3000
- **Access**: Public (unauthenticated)

**Failure Behavior**: If Docker build or deployment fails, workflow stops. Cleanup stage is skipped.

#### 4. Cleanup Stage
**Job**: `cleanup` (runs only if `deploy` succeeds)

Removes old Docker images to save storage costs:

- Authenticates with Google Cloud
- Lists all images in the repository
- Keeps the latest 10 tagged images
- Deletes older images

**Failure Behavior**: Uses `continue-on-error: true`, so cleanup failures don't mark the workflow as failed. The deployment has already succeeded at this point.

### Manual Workflow Dispatch

The deploy workflow can be triggered manually with these optional inputs:

- **run_deploy**: Whether to actually deploy (default: `true`)
  - Set to `false` to only build the image without pushing or deploying
- **image_tag**: Custom image tag (default: current commit SHA)
- **project_id**: Override GCP project ID
- **region**: Override deployment region
- **service_name**: Override Cloud Run service name
- **backend_base_url**: Backend API URL used at build time (default: `http://localhost:8080/v1`)

## Required Secrets

The following secrets must be configured in GitHub repository settings:

- **GCP_SA_KEY**: Google Cloud Platform service account JSON key with permissions for:
  - Artifact Registry (push images)
  - Cloud Run (deploy services)

## Workflow Permissions

### CI Workflow
- `contents: read` (default)

### Deploy Workflow
- `contents: read` - Access repository code

## Concurrency Control

**Deploy Workflow** uses concurrency settings:
```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false
```

This ensures only one deployment runs per branch at a time, and new deployments wait for the current one to complete rather than canceling it.

## Environment Variables

### CI Workflow
- `NODE_VERSION`: 20
- `GO_VERSION`: 1.21

### Deploy Workflow
- `NODE_VERSION`: 20
- `GO_VERSION`: 1.21
- `GCP_PROJECT_ID`: YOUR_PROJECT_ID
- `GAR_LOCATION`: us-central1
- `GAR_REPO`: web-apps
- `SERVICE_NAME`: gsdta-web
- `BACKEND_BASE_URL`: http://localhost:8080/v1

## Build Artifacts

### API Binary
Built with version metadata embedded via ldflags:
- Version: Git tag/commit
- Commit: Short commit SHA
- Build Time: ISO 8601 timestamp

### UI Application
Built with Next.js standalone output for optimized deployment:
- Server files in `.next/standalone`
- Static files in `.next/static`
- Public assets in `public`

### Docker Image
Multi-stage build combining both API and UI:
- Base: Node.js 20 alpine
- API binary copied from Go build stage
- UI Next.js standalone server
- Exposed port: 3000
- Entry point: Custom script handling both services

## Troubleshooting

### Build Failures
If the build stage fails:
1. Check that code compiles locally: `npm run build` (UI) and `go build ./cmd/api` (API)
2. Verify dependencies are correct in `package.json` and `go.mod`

### Test Failures
If the test stage fails:
1. Run tests locally: `npm test` (UI) and `go test ./...` (API)
2. Check linting: `npm run lint` (UI) and `golangci-lint run` (API)
3. Verify type checking: `npm run typecheck` (UI)

### Deploy Failures
If the deploy stage fails:
1. Verify GCP credentials are valid
2. Check that service account has required permissions
3. Ensure Docker image builds successfully
4. Verify Cloud Run service configuration

### Cleanup Failures
Cleanup failures are non-critical and don't fail the workflow. However, you may need to manually clean up old images to avoid storage costs.

## Best Practices

1. **Always merge to develop first**: Code should be merged to `develop` and pass CI before merging to `main`
2. **Branch protection**: Configure branch protection rules requiring CI checks to pass before merging
3. **Review before main**: All merges to `main` should go through pull request review
4. **Monitor deployments**: Check Cloud Run logs after deployment to verify the service is running correctly
5. **Test locally**: Always run builds and tests locally before pushing to avoid unnecessary CI runs

## Workflow Visualization

```
develop branch:
  Push → CI Workflow → Build & Test

main branch:
  Push → Deploy Workflow:
    1. Build Stage (compile API & UI)
       ↓ (fails = stop)
    2. Test Stage (lint & test API & UI)
       ↓ (fails = stop)
    3. Deploy Stage (Docker build → push → Cloud Run)
       ↓ (fails = stop)
    4. Cleanup Stage (remove old images)
       ↓ (fails = continues)
    ✓ Complete
```

## Future Enhancements

Potential improvements to consider:

- Add integration tests to test stage
- Add smoke tests after deployment
- Implement blue-green deployment strategy
- Add performance testing
- Cache Docker layers for faster builds
- Add notifications (Slack, email) on deployment success/failure
- Implement automatic rollback on deployment failure
