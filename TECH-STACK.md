# GSDTA Web - Technical Stack Consolidation

**Generated:** December 6, 2024  
**Purpose:** Comprehensive technical reference for all technologies, tools, and infrastructure

---

## 📚 Table of Contents

1. [Core Technologies](#core-technologies)
2. [Frontend Stack](#frontend-stack)
3. [Backend Stack](#backend-stack)
4. [Database & Storage](#database--storage)
5. [Authentication & Authorization](#authentication--authorization)
6. [Infrastructure & Deployment](#infrastructure--deployment)
7. [Development Tools](#development-tools)
8. [Testing Infrastructure](#testing-infrastructure)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Monitoring & Observability](#monitoring--observability)
11. [Security Tools](#security-tools)
12. [Package Management](#package-management)
13. [Build Tools](#build-tools)
14. [Version Control](#version-control)

---

## Core Technologies

### Runtime
- **Node.js:** v20+ (LTS)
  - Runtime for both UI and API
  - Native test runner for API tests
  - NPM workspaces for monorepo

### Language
- **TypeScript:** 5.9.3
  - Strict mode enabled
  - 100% coverage across codebase
  - Shared type definitions
  - TSConfig for different targets (Next.js, Cucumber, Node)

### Framework
- **Next.js:** 15.5.4
  - App Router architecture
  - Standalone output mode
  - API routes for backend
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - Used for both UI and API packages

---

## Frontend Stack

### UI Framework
- **React:** 19.1.0
  - Server Components support
  - Client Components for interactivity
  - Hooks for state management
  - Context API for global state

### Styling
- **Tailwind CSS:** v4 (PostCSS)
  - Utility-first CSS framework
  - JIT (Just-In-Time) compilation
  - Custom configuration
  - Dark mode support via CSS variables
  - `@tailwindcss/postcss` for v4 features
  - `@tailwindcss/oxide` for native bindings

- **lightningcss**
  - Fast CSS bundler and minifier
  - Platform-specific native binaries
  - CSS transformation and optimization

### Form Management
- **React Hook Form:** 7.53.0
  - Performance-optimized forms
  - Built-in validation
  - TypeScript integration

- **@hookform/resolvers:** 3.9.0
  - Schema validation integration
  - Zod resolver support

### Validation
- **Zod:** 3.23.8
  - TypeScript-first schema validation
  - Runtime type checking
  - Form validation integration

### PDF Handling
- **pdfjs-dist:** 3.11.174
  - PDF rendering in browser
  - Worker script for performance
  - Text extraction support

- **@react-pdf-viewer/core:** 3.12.0
  - React wrapper for PDF.js
  - Interactive PDF viewer
  - Custom toolbar support

### Utilities
- **xlsx:** 0.18.5
  - Excel file parsing
  - Data export to spreadsheets

### UI Components
- Custom component library (built in-house)
- No external UI component library dependency
- Tailwind-based components

---

## Backend Stack

### API Framework
- **Next.js API Routes:** 15.5.4
  - RESTful API endpoints
  - Route handlers in App Router
  - Middleware support
  - TypeScript integration

### Firebase Admin
- **firebase-admin:** 13.5.0
  - Server-side Firebase SDK
  - Authentication verification
  - Firestore database access
  - Custom token generation
  - User management

### API Documentation
- **swagger-jsdoc:** 6.2.8
  - OpenAPI specification generation
  - JSDoc comments to OpenAPI
  - Endpoint documentation
  - Schema definitions

### Runtime Features
- Process management with Supervisor
- Dual server architecture (UI:3000, API:8080)
- Internal proxy routing
- Health check endpoints

---

## Database & Storage

### Primary Database
- **Cloud Firestore (Native Mode)**
  - NoSQL document database
  - Real-time synchronization
  - Offline support
  - ACID transactions
  - Location: us-central1

### Collections
```
firestore/
├── users/              # User profiles
│   ├── {uid}
│   │   ├── email
│   │   ├── displayName
│   │   ├── roles (array)
│   │   ├── status
│   │   ├── createdAt
│   │   └── updatedAt
│
├── roleInvites/        # Teacher/Admin invites
│   ├── {inviteId}
│   │   ├── email
│   │   ├── role
│   │   ├── token
│   │   ├── status
│   │   ├── expiresAt
│   │   └── createdAt
│
└── students/           # Student records
    └── {studentId}
        ├── firstName
        ├── lastName
        ├── parentIds (array)
        └── metadata
```

### Indexes
- Composite index on `users.roles` and `users.status`
- Index on `roleInvites.token` for quick lookup
- Index on `roleInvites.status` and `roleInvites.expiresAt`

### Security Rules
- Role-based access control
- User can read/update own profile
- Admin can manage all users
- Public cannot read users
- Admin-only access to invites

---

## Authentication & Authorization

### Firebase Authentication
- **Firebase Client SDK:** 10.14.1
  - Email/password authentication
  - Google sign-in (configured but not active)
  - Email verification
  - Password reset
  - Token management

### Authentication Modes
1. **Firebase Mode (Production)**
   - Real Firebase Authentication
   - Cloud Firestore backend
   - Custom claims for roles

2. **Mock Mode (Development)**
   - In-memory user store
   - Simulated authentication
   - Fast development iteration

### Custom Claims
```typescript
{
  roles: ['admin' | 'teacher' | 'parent'],
  status: 'active' | 'suspended' | 'pending',
  emailVerified: boolean
}
```

### Session Management
- Firebase ID tokens (JWT)
- Token stored in sessionStorage
- Automatic token refresh
- Server-side token verification

---

## Infrastructure & Deployment

### Cloud Platform
- **Google Cloud Platform (GCP)**
  - Project: playground-personal-474821
  - Region: us-central1

### Container Registry
- **Google Artifact Registry**
  - Repository: web-apps
  - Format: Docker
  - Location: us-central1-docker.pkg.dev

### Compute
- **Google Cloud Run**
  - Service: gsdta-web
  - Container: Node.js 20 Alpine
  - Ports: 3000 (UI), 8080 (API)
  - Autoscaling: Enabled
  - HTTPS: Automatic
  - Authentication: Public (unauthenticated)

### Container Architecture
```
Docker Image Structure:
├── Stage 1: ui-deps (Node 20 Alpine)
│   └── Install UI dependencies
├── Stage 2: api-deps (Node 20 Alpine)
│   └── Install API dependencies
├── Stage 3: ui-builder
│   └── Build Next.js UI
├── Stage 4: api-builder
│   └── Build Next.js API
└── Stage 5: runner (Production)
    ├── Supervisor for process management
    ├── UI server (port 3000)
    ├── API server (port 8080)
    └── Non-root user (nextjs:1001)
```

### DNS & Domain
- Custom domain setup supported
- HTTPS via Cloud Run
- Domain mapping configuration in docs

### Secrets Management
- **Google Secret Manager**
  - FIREBASE_API_KEY
  - FIREBASE_AUTH_DOMAIN
  - FIREBASE_PROJECT_ID
  - FIREBASE_APP_ID
  - Service account credentials

---

## Development Tools

### Code Editor
- **Visual Studio Code**
  - Recommended extensions documented
  - Workspace settings included
  - Debug configurations

### Linting
- **ESLint:** v9
  - Next.js config base
  - TypeScript rules
  - React hooks rules
  - Custom rules for project

### Formatting
- **Prettier**
  - Consistent code formatting
  - Pre-commit hook integration
  - Format on save recommended

### Type Checking
- **TypeScript Compiler (tsc)**
  - Strict mode enabled
  - No emit mode for checking
  - Project references for monorepo

### Git Hooks
- **Husky**
  - Pre-commit hooks
  - Lint staged files
  - Run tests before push

### Commit Standards
- **Commitlint:** 19.5.0
  - Conventional commits
  - Commit message validation
  - Changelog generation support

---

## Testing Infrastructure

### Unit Testing

#### UI Tests
- **Jest**
  - Test runner for UI
  - React component testing
  - Snapshot testing
  - Coverage reporting

- **@testing-library/react**
  - Component testing utilities
  - User-centric testing
  - Accessibility testing

- **@testing-library/jest-dom**
  - Custom matchers for DOM
  - Enhanced assertions

#### API Tests
- **Node Native Test Runner**
  - Built-in Node.js testing
  - No external dependencies
  - Fast execution
  - TypeScript support via tsx

- **tsx:** 4.20.6
  - TypeScript execution for tests
  - No compilation step needed

### E2E Testing

#### UI E2E
- **Playwright:** 1.56.1
  - Cross-browser testing (Chromium primary)
  - Parallel test execution
  - Screenshot on failure
  - Video recording
  - Trace viewer
  - Auto-wait for elements
  - Network interception

#### API E2E
- **Cucumber.js:** v11
  - Behavior-driven development (BDD)
  - Gherkin syntax
  - Feature file documentation
  - Step definitions in TypeScript

- **@cucumber/cucumber**
  - Test runner
  - Reporting
  - Hooks and tags

### Test Utilities
- **start-server-and-test:** 2.0.5
  - Start server before tests
  - Wait for server ready
  - Clean shutdown after tests

### Firebase Emulators
- **Firebase Emulator Suite**
  - Auth Emulator (port 9099)
  - Firestore Emulator (port 8889)
  - Emulator UI (port 4445)
  - Data persistence in `firebase-data/`
  - Test data seeding

---

## CI/CD Pipeline

### Platform
- **GitHub Actions**
  - YAML-based workflows
  - Matrix builds
  - Caching strategies
  - Secrets management

### Workflows

#### 1. CI Workflow (`.github/workflows/ci.yml`)
**Trigger:** Push to `develop` branch
**Jobs:**
1. `emulator-setup`
   - Start Firebase Emulators
   - Seed test data
   - Cache emulators

2. `api`
   - Install dependencies
   - Lint (ESLint)
   - Type check (tsc)
   - E2E tests (Cucumber)

3. `ui`
   - Install dependencies
   - Install platform-specific binaries
   - Lint (ESLint)
   - Type check (tsc)
   - Unit tests (Jest)
   - E2E tests (Playwright)

**Container:** `mcr.microsoft.com/playwright:v1.56.1-jammy`

#### 2. Deploy Workflow (`.github/workflows/deploy.yml`)
**Trigger:** Push to `main` or manual dispatch
**Jobs:**
1. `emulator-tests`
   - Pre-deployment validation
   - Firebase Emulator tests
   - Lint and type check

2. `api`
   - Build verification
   - Test suite execution

3. `ui`
   - Build verification
   - Full test suite

4. `docker`
   - Google Cloud authentication
   - Fetch Firebase secrets from GCP
   - Multi-stage Docker build
   - Push to Artifact Registry
   - Image tagging

5. `deploy`
   - Deploy to Cloud Run
   - Configure environment variables
   - Mount secrets
   - Health check verification

### Caching Strategy
- npm dependencies
- Firebase Emulator binaries
- Platform-specific native modules

### Environment Variables (CI)
```bash
# Node
NODE_VERSION=20

# GCP
GCP_PROJECT_ID=playground-personal-474821
GAR_LOCATION=us-central1
GAR_REPO=web-apps
SERVICE_NAME=gsdta-web

# Firebase Emulators
FIRESTORE_EMULATOR_HOST=localhost:8889
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_PROJECT_ID=demo-gsdta

# Build
NEXT_PUBLIC_AUTH_MODE=firebase
NEXT_PUBLIC_USE_MSW=false
NEXT_PUBLIC_API_BASE_URL=/api
```

---

## Monitoring & Observability

### Logging
- **Cloud Logging (Google Cloud)**
  - Structured JSON logs
  - Request ID correlation
  - Log levels: DEBUG, INFO, WARN, ERROR
  - Log retention policies

### Request Tracking
- Request ID generation
- Request/response logging
- User identification
- IP address tracking

### Health Checks
- `GET /api/v1/health` endpoint
- Liveness probe
- Readiness probe
- Dependency checks

### Metrics (Available but Not Configured)
- Cloud Monitoring (Stackdriver)
- Request latency
- Error rates
- Resource utilization

### Error Tracking (Not Yet Implemented)
- Potential: Sentry, Rollbar, or Cloud Error Reporting
- Client-side errors
- Server-side exceptions
- Stack traces

---

## Security Tools

### Authentication
- Firebase Authentication
- JWT token verification
- Custom claims validation

### Authorization
- Role-based access control (RBAC)
- Firestore security rules
- API endpoint guards

### Rate Limiting
- In-memory rate limiter (per IP)
- Endpoint-specific limits
- `Retry-After` headers

### CORS
- Origin whitelisting
- Development: localhost allowed
- Production: specific domains only

### Input Validation
- Zod schemas
- Request body validation
- Query parameter sanitization

### Secrets
- Environment variables
- GCP Secret Manager
- Build-time vs runtime secrets

### Container Security
- Non-root user (nextjs:1001)
- Minimal Alpine base image
- No unnecessary packages
- Security scanning (available in GCP)

---

## Package Management

### Package Manager
- **npm:** 10+ (included with Node 20)
  - Workspaces for monorepo
  - Lock file: package-lock.json
  - CI mode for clean installs

### Monorepo Structure
```
gsdta-web/
├── package.json           # Root workspace
├── ui/
│   └── package.json       # UI dependencies
├── api/
│   └── package.json       # API dependencies
└── scripts/
    └── package.json       # Seed scripts
```

### Dependency Strategy
- Pinned versions for stability
- Regular security updates
- Minimal dependencies
- Tree shaking for production

### Key Scripts (Root)
```json
{
  "seed": "cd scripts && npm run seed",
  "seed:clear": "cd scripts && npm run seed:clear",
  "emulators": "firebase emulators:start",
  "dev:ui": "cd ui && npm run dev",
  "dev:api": "cd api && npm run dev",
  "build:ui": "cd ui && npm run build",
  "build:api": "cd api && npm run build",
  "lint:ui": "cd ui && npm run lint",
  "lint:api": "cd api && npm run lint",
  "typecheck:ui": "cd ui && npm run typecheck",
  "typecheck:api": "cd api && npm run typecheck"
}
```

---

## Build Tools

### Bundler
- **Next.js Built-in (Webpack/Turbopack)**
  - Code splitting
  - Tree shaking
  - Minification
  - Source maps (production)

### CSS Processing
- **PostCSS**
  - Tailwind CSS processing
  - lightningcss transformation
  - Autoprefixer
  - CSS modules support

### TypeScript Compilation
- **tsc (TypeScript Compiler)**
  - Type checking only (noEmit)
  - Next.js handles compilation

- **tsx (TypeScript Execute)**
  - Runtime TypeScript execution
  - Test scripts
  - Seed scripts

### Docker Build
- **Docker Buildx**
  - Multi-stage builds
  - Build cache optimization
  - Platform-specific builds
  - Build arguments

### Build Optimization
- Standalone output mode
- Static file optimization
- Dependency pruning
- Layer caching

---

## Version Control

### Platform
- **GitHub**
  - Repository: gsdta/gsdta-web
  - Branch protection rules
  - Pull request reviews
  - Actions integration

### Branching Strategy
- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `minor-fixes` - Small fixes

### Git Configuration
- `.gitignore` for Node.js, Next.js, Docker
- `.gitattributes` for line endings
- Husky for git hooks
- Commitlint for commit messages

### Commit Convention
- **Conventional Commits**
  - `feat:` - New feature
  - `fix:` - Bug fix
  - `docs:` - Documentation
  - `refactor:` - Code refactoring
  - `test:` - Tests
  - `chore:` - Maintenance

---

## Development Environment

### Prerequisites
- Node.js 20+
- npm 10+
- Docker Desktop (optional)
- Firebase CLI
- Git
- Java 21 (for Firebase Emulators)

### Environment Files
```
ui/.env.local              # UI development config
api/.env.local             # API development config
ui/.env.local.emulator     # UI emulator template
api/.env.local.emulator    # API emulator template
```

### Local Development Modes

#### 1. Native (3 Terminals)
```bash
# Terminal 1: Emulators
npm run emulators

# Terminal 2: API
npm run dev:api

# Terminal 3: UI
npm run dev:ui
```

#### 2. Docker Compose
```bash
docker-compose -f docker-compose.local.yml up --build
```

#### 3. Quick Start Script
```bash
./start-dev-local.sh
```

### Development URLs
- UI: http://localhost:3000
- API: http://localhost:8080
- Emulator UI: http://localhost:4445
- Auth Emulator: localhost:9099
- Firestore Emulator: localhost:8889

---

## Platform-Specific Considerations

### Native Binaries
- **lightningcss** - Platform-specific builds
  - `lightningcss-darwin-arm64` (macOS Apple Silicon)
  - `lightningcss-darwin-x64` (macOS Intel)
  - `lightningcss-linux-x64-gnu` (Linux)

- **@tailwindcss/oxide** - Native Rust bindings
  - Automatically installed per platform

### CI/CD Platform
- **Ubuntu Latest** for GitHub Actions
- **Playwright Container** for consistent browser testing
- **Alpine Linux** for Docker production images

---

## Configuration Files

### TypeScript
- `ui/tsconfig.json` - UI TypeScript config
- `api/tsconfig.json` - API TypeScript config
- `api/tsconfig.cucumber.json` - Cucumber test config

### Next.js
- `ui/next.config.ts` - UI configuration
- `api/next.config.ts` - API configuration

### Docker
- `Dockerfile` - Multi-stage production build
- `Dockerfile.dev` - Development build
- `docker-compose.yml` - Production compose
- `docker-compose.local.yml` - Local development compose

### Firebase
- `firebase.json` - Firebase configuration
- `persistence/firestore.rules` - Security rules
- `persistence/firestore.indexes.json` - Database indexes

### Testing
- `ui/jest.config.cjs` - Jest configuration
- `ui/playwright.config.ts` - Playwright configuration
- `api/cucumber.js` - Cucumber configuration

### Linting
- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier config
- `.commitlintrc` - Commit lint rules

### Git
- `.gitignore` - Ignored files
- `.gitattributes` - Git attributes
- `.github/` - GitHub Actions workflows

---

## Performance Optimizations

### Build Time
- Multi-stage Docker builds
- Dependency caching
- Parallel builds where possible
- Native binary pre-installation

### Runtime
- Next.js standalone output
- Code splitting
- Image optimization (disabled for static)
- Font optimization
- CSS minification

### Network
- HTTP/2 on Cloud Run
- Compression enabled
- CDN integration (not yet active)

---

## Cost Optimization

### Firebase
- Firestore in Native mode
- Auth usage metered
- Emulators for development (free)

### Google Cloud
- Cloud Run pay-per-use
- Artifact Registry storage costs
- Secret Manager API calls
- Egress charges

### Development
- Local emulators (free)
- GitHub Actions minutes (free tier)

---

## Compatibility Matrix

### Node.js
- Minimum: v20
- Recommended: v20 LTS
- Tested: v20.x, v25.2.0 (macOS)

### Browsers
- Chrome/Chromium: Latest
- Firefox: Latest (not actively tested)
- Safari: Latest (not actively tested)
- Edge: Latest (not actively tested)

### Operating Systems
- Development: macOS, Windows, Linux
- Production: Linux (Alpine in container)
- CI: Ubuntu Latest

---

## External Services

### Required
- Google Cloud Platform
- Firebase (Auth + Firestore)
- GitHub (repository + Actions)

### Optional
- Google Sheets (legacy, being replaced)
- Email service (future)
- SMS service (future)

---

## Documentation Tools

### API Documentation
- OpenAPI/Swagger 3.0
- swagger-jsdoc for generation
- Served at `/api/v1/docs`

### Code Documentation
- JSDoc comments
- TypeScript types as documentation
- Inline comments for complex logic

### Project Documentation
- Markdown files
- README files per package
- Comprehensive guides in `docs/`

---

## Maintenance & Updates

### Dependencies
- Regular security updates
- Monthly dependency review
- Automated vulnerability scanning

### Platform Updates
- Next.js updates (breaking changes reviewed)
- React updates (compatibility tested)
- Firebase SDK updates (tested in staging)
- Node.js LTS migrations

### Infrastructure
- GCP service updates
- Cloud Run feature adoption
- Firestore improvements

---

## Future Technology Considerations

### Potential Additions
- GraphQL API layer
- Redis/Memorystore for caching
- Cloud CDN for static assets
- Cloud Tasks for async jobs
- Cloud Pub/Sub for events
- Sentry for error tracking
- Datadog/New Relic for APM
- Algolia for search

### Evaluation Criteria
- Alignment with existing stack
- Cost implications
- Learning curve
- Community support
- Long-term viability

---

## Support & Resources

### Documentation
- Project README: `/README.md`
- API Docs: `/api/README.md`
- UI Docs: `/ui/README.md`
- Features: `/docs/features.md`
- Architecture: Referenced in docs

### External Resources
- Next.js: https://nextjs.org/docs
- React: https://react.dev/
- Firebase: https://firebase.google.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Playwright: https://playwright.dev/
- TypeScript: https://www.typescriptlang.org/docs/

### Community
- GitHub Issues
- Pull Requests
- Code Reviews

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2024  
**Maintained By:** Development Team  
**Next Review:** Quarterly or after major technology changes
