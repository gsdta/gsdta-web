# GSDTA Web

[![Deploy to QA with UAT](https://github.com/gsdta/gsdta-web/actions/workflows/deploy-qa-with-uat.yml/badge.svg)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy-qa-with-uat.yml)

Modern Tamil school management system with Next.js UI and API, deployed as a single Docker container.

## 📁 Structure

```
gsdta-web/
├── ui/                 # Next.js frontend (App Router)
├── api/                # Express.js API (TypeScript)
├── scripts/            # Seed scripts and utilities
├── docs/               # Documentation (single source of truth)
│   ├── FEATURES.md     # Implemented features tracker
│   ├── ROLES.md        # Complete role capability matrix
│   ├── TECH-STACK.md   # Technology reference
│   └── ...
└── Dockerfile          # Production container
```

## 🚀 Quick Start

### Local Development (Recommended)

**One-command start:**
```bash
./start-dev-local.sh
```

Choose option 1 (local) or 2 (Docker), then visit:
- **UI**: http://localhost:3000
- **API**: http://localhost:8080
- **Emulator UI**: http://localhost:4445

**Test credentials**:
- Admin: admin@test.com / admin123
- Teacher: teacher@test.com / teacher123
- Parent: parent@test.com / parent123

**Complete setup guide**: See [QUICKSTART-EMULATORS.md](./QUICKSTART-EMULATORS.md)

### Development Services

- **UI Dev Server**: Next.js on port 3000
- **API Dev Server**: Express on port 8080  
- **Firebase Emulators**: Auth (9099), Firestore (8889), UI (4445)
- **Test Data**: Automatically seeded (5 users, seed script available)

## 🧪 Testing

### Quick Test Commands
```bash
# E2E Tests (automated)
./run-e2e-tests.sh

# Unit Tests
npm run test:ui    # UI tests
npm run test:api   # API tests

# Linting & Type Checking
npm run lint:ui
npm run typecheck:ui
```

**Detailed guides**:
- [RUN-TESTS.md](./RUN-TESTS.md) - Unit tests
- [RUN-E2E-TESTS.md](./RUN-E2E-TESTS.md) - E2E tests with Playwright

## 📚 Documentation

### Essential Docs (Start Here)

| Document | Description |
|----------|-------------|
| [QUICKSTART-EMULATORS.md](./QUICKSTART-EMULATORS.md) | Quick dev environment setup ⭐ |
| [docs/FEATURES.md](./docs/FEATURES.md) | Implemented features status |
| [docs/ROLES.md](./docs/ROLES.md) | Complete role capability matrix |
| [RUN-TESTS.md](./RUN-TESTS.md) | Testing guide |

### Technical Reference

| Document | Description |
|----------|-------------|
| [docs/TECH-STACK.md](./docs/TECH-STACK.md) | Technology stack reference |
| [docs/FIRESTORE-COLLECTIONS.md](./docs/FIRESTORE-COLLECTIONS.md) | Data model |
| [docs/TESTING.md](./docs/TESTING.md) | Test infrastructure |
| [docs/PROJECT-STATUS.md](./docs/PROJECT-STATUS.md) | Project overview |

### Deployment & Infrastructure

| Document | Description |
|----------|-------------|
| [docs/INFRASTRUCTURE-SETUP.md](./docs/INFRASTRUCTURE-SETUP.md) | GCP deployment guide |
| [docs/PRODUCTION-READINESS.md](./docs/PRODUCTION-READINESS.md) | Launch checklist |
| [docs/GCLOUD-COMMANDS.md](./docs/GCLOUD-COMMANDS.md) | GCloud CLI reference |

### AI Assistant Guidelines

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | AI assistant instructions |
| [.github/copilot-instructions.md](./.github/copilot-instructions.md) | GitHub Copilot config |

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: Google Cloud Firestore
- **Auth**: Firebase Authentication
- **Hosting**: Google Cloud Run
- **CI/CD**: GitHub Actions
- **Testing**: Jest, Playwright, Cucumber

See [docs/TECH-STACK.md](./docs/TECH-STACK.md) for complete details.

## 📦 Quick Reference

### Common Commands
```bash
# Start development
./start-dev-local.sh

# Seed emulator data
npm run seed

# Reset emulator data
npm run seed:clear && npm run seed

# Run all tests
npm run test:ui && npm run test:api

# E2E tests
./run-e2e-tests.sh
```

### Useful Links
- Emulator UI: http://localhost:4445
- Firestore Emulator: http://localhost:8889
- Auth Emulator: http://localhost:9099

## 🤝 Contributing

1. Follow code patterns in `.github/copilot-instructions.md`
2. Run tests before committing
3. Update documentation when adding features
4. See [docs/FEATURES.md](./docs/FEATURES.md) for feature status

## 📄 License

See [LICENSE](./LICENSE).

---

**Need help?** Start with [QUICKSTART-EMULATORS.md](./QUICKSTART-EMULATORS.md) for local development setup.
