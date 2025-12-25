# UAT Testing Implementation Plan

## Overview

Add UAT (User Acceptance Testing) tests that run against the live QA environment after deployment. On success, automatically create and merge a PR to main, triggering production deployment.

- **Framework**: Cucumber + Playwright (BDD-style)
- **Automation**: Full auto-merge pipeline
- **Scope**: Full regression suite

---

## CI/CD Flow

```
merge to develop
      ↓
  unit tests + E2E tests (emulator-based)
      ↓
  deploy to QA (https://app.qa.gsdta.com)
      ↓
  UAT tests against live QA
      ↓
  auto-create PR (develop → main)
      ↓
  auto-merge PR
      ↓
  deploy to production (triggered by main push)
```

---

## Folder Structure

```
uat/
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── cucumber.js                     # Cucumber configuration
├── playwright.config.ts            # Playwright browser settings
├── .env.example                    # Environment variable template
├── README.md                       # Documentation
├── IMPLEMENTATION-PLAN.md          # This file
│
├── features/                       # BDD feature files (Gherkin)
│   ├── smoke/
│   │   └── critical-paths.feature  # Quick deployment validation
│   ├── auth/
│   │   ├── login.feature
│   │   └── logout.feature
│   ├── admin/
│   │   ├── dashboard.feature
│   │   ├── students.feature
│   │   ├── teachers.feature
│   │   ├── classes.feature
│   │   ├── grades.feature
│   │   ├── textbooks.feature
│   │   └── volunteers.feature
│   ├── teacher/
│   │   ├── dashboard.feature
│   │   └── classes.feature
│   ├── parent/
│   │   ├── dashboard.feature
│   │   ├── students.feature
│   │   └── profile.feature
│   └── public/
│       ├── home.feature
│       ├── about.feature
│       ├── calendar.feature
│       └── documents.feature
│
├── steps/                          # Step definitions
│   ├── auth.steps.ts
│   ├── navigation.steps.ts
│   ├── admin.steps.ts
│   ├── teacher.steps.ts
│   ├── parent.steps.ts
│   └── common.steps.ts
│
├── support/                        # Test support files
│   ├── config.ts                   # Environment configuration
│   ├── world.ts                    # Custom Cucumber World with Playwright
│   ├── hooks.ts                    # Before/After hooks
│   ├── auth-helper.ts              # Firebase Auth helper for QA
│   └── api-helper.ts               # API request helpers
│
├── fixtures/                       # Test fixtures and data
│   ├── test-users.ts               # QA test user credentials
│   └── test-data.ts                # Reusable test data
│
└── reports/                        # Generated test reports (gitignored)
    ├── cucumber-report.json
    ├── cucumber-report.html
    └── screenshots/
```

---

## GitHub Workflows

### New Workflow: `.github/workflows/deploy-qa-with-uat.yml`

Replaces the existing `deploy-qa.yml`. Flow:
1. CI tests (unit + E2E against emulators)
2. Deploy to QA
3. Run UAT tests against live QA
4. Auto-create PR (develop → main)
5. Auto-merge PR

### Reusable Workflow: `.github/workflows/_uat.yml`

Reusable UAT workflow that can be called from other workflows with inputs:
- `base_url`: URL to test against
- `tags`: Cucumber tags to run
- `runner`: GitHub runner to use

---

## Authentication Strategy

### Test Users in QA Firebase

| Role    | Email                  | Secret             |
|---------|------------------------|--------------------|
| Admin   | uat-admin@gsdta.com    | UAT_ADMIN_PASSWORD |
| Teacher | uat-teacher@gsdta.com  | UAT_TEACHER_PASSWORD |
| Parent  | uat-parent@gsdta.com   | UAT_PARENT_PASSWORD |

### Auth Flow

1. Use Firebase SDK to authenticate against live QA Firebase (`gsdta-qa` project)
2. Login via UI to simulate real user flow
3. Store credentials in GitHub Secrets

---

## GitHub Secrets to Add

```
# UAT Test User Credentials
UAT_ADMIN_EMAIL
UAT_ADMIN_PASSWORD
UAT_TEACHER_EMAIL
UAT_TEACHER_PASSWORD
UAT_PARENT_EMAIL
UAT_PARENT_PASSWORD

# Firebase Config for QA
QA_FIREBASE_API_KEY
```

---

## Repository Settings Required

1. **Enable "Allow auto-merge"** in repository settings
2. **Branch protection for `main`:**
   - Required status checks: Unit Tests, E2E Tests
   - Allow auto-merge to bypass review (or remove review requirement)

---

## Implementation Phases

### Phase 1: UAT Infrastructure ✅ COMPLETE
- [x] Create `uat/` folder structure
- [x] Create `uat/package.json` with dependencies
- [x] Create `uat/tsconfig.json`
- [x] Create `uat/cucumber.js` configuration
- [x] Create `uat/playwright.config.ts`
- [x] Update root `package.json` to add uat workspace

### Phase 2: Support Layer ✅ COMPLETE
- [x] Create `uat/support/config.ts` - environment config
- [x] Create `uat/support/world.ts` - Custom World with Playwright
- [x] Create `uat/support/auth-helper.ts` - Firebase Auth helper
- [x] Create `uat/support/hooks.ts` - Before/After hooks
- [x] Create `uat/support/api-helper.ts` - API request helpers

### Phase 3: Smoke Tests ✅ COMPLETE
- [x] Create `uat/features/smoke/critical-paths.feature`
- [x] Create `uat/steps/auth.steps.ts`
- [x] Create `uat/steps/navigation.steps.ts`
- [x] Create `uat/steps/common.steps.ts`

### Phase 4: GitHub Workflows ✅ COMPLETE
- [x] Create `.github/workflows/_uat.yml` (reusable)
- [x] Create `.github/workflows/deploy-qa-with-uat.yml` (main workflow)
- [ ] Archive/remove old `deploy-qa.yml` (optional - keep as backup)

### Phase 5: QA Environment Setup ⏳ MANUAL STEPS REQUIRED
- [ ] Create test users in QA Firebase
- [ ] Add GitHub Secrets for UAT credentials
- [ ] Enable auto-merge in repository settings

### Phase 6: Full Regression Suite ✅ COMPLETE
- [x] Create auth feature files (login.feature, logout.feature)
- [x] Create admin feature files (dashboard, students, teachers, classes, grades, textbooks, volunteers)
- [x] Create teacher feature files (dashboard, classes)
- [x] Create parent feature files (dashboard, students, profile)
- [x] Create public page feature files (home, about, calendar, documents)
- [x] Create corresponding step definitions

### Phase 7: Testing & Refinement ⏳ PENDING
- [ ] Run UAT locally against QA
- [ ] Test full workflow end-to-end
- [ ] Refine and fix any issues

---

## Key Scripts

```bash
# Run all UAT tests
npm run test

# Run smoke tests only
npm run test:smoke

# Run tests by role
npm run test:admin
npm run test:teacher
npm run test:parent

# Run in CI mode (with reports)
npm run test:ci

# Run tests in parallel
npm run test:parallel
```

---

## Environment Variables

```bash
# Required
UAT_BASE_URL=https://app.qa.gsdta.com

# Firebase Auth
FIREBASE_API_KEY=your-qa-api-key
FIREBASE_AUTH_DOMAIN=gsdta-qa.firebaseapp.com
FIREBASE_PROJECT_ID=gsdta-qa

# Test Users
UAT_ADMIN_EMAIL=uat-admin@gsdta.com
UAT_ADMIN_PASSWORD=your-password
UAT_TEACHER_EMAIL=uat-teacher@gsdta.com
UAT_TEACHER_PASSWORD=your-password
UAT_PARENT_EMAIL=uat-parent@gsdta.com
UAT_PARENT_PASSWORD=your-password

# Optional
HEADLESS=true
SLOW_MO=0
```

---

## Failure Handling

### On UAT Failure
1. Screenshots captured automatically
2. HTML/JSON reports uploaded as artifacts
3. Auto-merge is blocked
4. Workflow marked as failed

### Retry Strategy
- Cucumber: `retry: 1` for flaky tests in CI
- Optional workflow-level retry

### Manual Override
Keep `deploy-manual.yml` for emergency deployments that need to skip UAT.

---

## Sample Feature File

```gherkin
@smoke @critical
Feature: Critical Path Smoke Tests
  Quick validation that core functionality works after deployment

  @auth
  Scenario: Admin can log in successfully
    Given I am on the sign in page
    When I enter admin credentials
    And I click the sign in button
    Then I should be redirected to the admin dashboard
    And I should see the welcome message

  @api
  Scenario: Health endpoint is responding
    When I check the health endpoint
    Then the response status should be 200
```
