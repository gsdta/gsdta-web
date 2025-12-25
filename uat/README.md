# UAT (User Acceptance Testing)

UAT tests for the GSDTA Web Application. These tests run against the live QA environment after deployment to validate functionality before auto-merging to production.

## Overview

- **Framework**: Cucumber (BDD) + Playwright (browser automation)
- **Target**: Live QA environment (https://app.qa.gsdta.com)
- **Purpose**: Validate deployment before production

## Quick Start

### Prerequisites

1. Node.js 20+
2. Test users created in QA Firebase
3. Environment variables configured

### Setup

```bash
# Install dependencies (from project root)
npm install

# Copy and configure environment variables
cp uat/.env.example uat/.env
# Edit uat/.env with your credentials
```

### Running Tests

```bash
# From project root:

# Run all UAT tests
npm run uat

# Run smoke tests only (quick validation)
npm run uat:smoke

# Run in CI mode (with reports)
npm run uat:ci

# From uat/ directory:

# Run by tag
npm run test:admin    # Admin features only
npm run test:teacher  # Teacher features only
npm run test:parent   # Parent features only
npm run test:auth     # Auth features only
npm run test:public   # Public pages only

# Run in parallel
npm run test:parallel
```

## Folder Structure

```
uat/
├── features/           # BDD feature files (Gherkin)
│   ├── smoke/          # Quick deployment validation
│   ├── auth/           # Login/logout tests
│   ├── admin/          # Admin role tests
│   ├── teacher/        # Teacher role tests
│   ├── parent/         # Parent role tests
│   └── public/         # Public page tests
├── steps/              # Step definitions
├── support/            # Test support files
│   ├── config.ts       # Environment configuration
│   ├── world.ts        # Cucumber World with Playwright
│   ├── auth-helper.ts  # Firebase Auth helper
│   ├── hooks.ts        # Before/After hooks
│   └── api-helper.ts   # API request helpers
└── reports/            # Generated reports (gitignored)
```

## CI/CD Integration

The UAT tests are integrated into the deployment pipeline:

```
develop branch push
       ↓
   Unit + E2E tests (emulators)
       ↓
   Deploy to QA
       ↓
   UAT tests (live QA)
       ↓
   Auto-create PR → Auto-merge to main
       ↓
   Production deploy
```

See `.github/workflows/deploy-qa-with-uat.yml` for details.

## Writing Tests

### Feature Files (Gherkin)

```gherkin
@admin
Feature: Admin Student Management
  As an admin
  I want to manage students
  So that I can maintain accurate records

  Background:
    Given I am logged in as admin

  @smoke
  Scenario: Admin can view students list
    When I navigate to the admin students page
    Then I should see the students table
```

### Tags

- `@smoke` - Quick smoke tests for deployment validation
- `@admin`, `@teacher`, `@parent` - Role-specific tests
- `@auth` - Authentication tests
- `@public` - Public page tests
- `@skip` - Skip this test
- `@wip` - Work in progress
- `@manual` - Requires manual intervention

### Step Definitions

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';

When('I navigate to the admin students page', async function (this: CustomWorld) {
  await this.page.goto('/admin/students', { waitUntil: 'networkidle' });
});
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `UAT_BASE_URL` | Base URL for tests | Yes |
| `FIREBASE_API_KEY` | QA Firebase API key | Yes |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `UAT_ADMIN_EMAIL` | Admin test user email | Yes |
| `UAT_ADMIN_PASSWORD` | Admin test user password | Yes |
| `UAT_TEACHER_EMAIL` | Teacher test user email | Yes |
| `UAT_TEACHER_PASSWORD` | Teacher test user password | Yes |
| `UAT_PARENT_EMAIL` | Parent test user email | Yes |
| `UAT_PARENT_PASSWORD` | Parent test user password | Yes |
| `HEADLESS` | Run browser headless | No (default: true) |
| `SLOW_MO` | Slow down actions (ms) | No (default: 0) |

## GitHub Secrets

Add these secrets to your GitHub repository:

```
UAT_ADMIN_EMAIL
UAT_ADMIN_PASSWORD
UAT_TEACHER_EMAIL
UAT_TEACHER_PASSWORD
UAT_PARENT_EMAIL
UAT_PARENT_PASSWORD
QA_FIREBASE_API_KEY
```

## Test Users

Create these users in the QA Firebase Authentication:

| Role | Email | Notes |
|------|-------|-------|
| Admin | uat-admin@gsdta.com | Assign admin role in Firestore |
| Teacher | uat-teacher@gsdta.com | Assign teacher role in Firestore |
| Parent | uat-parent@gsdta.com | Assign parent role, link test students |

## Reports

After running tests, reports are generated in `uat/reports/`:

- `cucumber-report.html` - HTML report with all scenarios
- `cucumber-report.json` - JSON report for CI integration
- `screenshots/` - Screenshots of failed tests

## Debugging

### Run with headed browser
```bash
HEADLESS=false npm run uat
```

### Slow down execution
```bash
SLOW_MO=500 npm run uat
```

### Run single feature
```bash
cd uat && npx cucumber-js features/smoke/critical-paths.feature
```

### Run with specific tag
```bash
cd uat && npx cucumber-js --tags "@smoke"
```

## Troubleshooting

### Tests fail with authentication error
- Verify test users exist in QA Firebase
- Check credentials in .env or GitHub Secrets
- Ensure users have correct roles in Firestore

### Tests fail with timeout
- Check if QA environment is healthy: `curl https://app.qa.gsdta.com/api/v1/health`
- Increase timeout in cucumber.js if needed
- Check network connectivity

### Screenshots not capturing
- Ensure reports/screenshots directory exists
- Check file permissions
