API E2E tests (Cucumber)

- Run the API server and tests in one go:
  npm run test:e2e

- Or run only the tests (expects server on http://localhost:8080):
  npm run test:cucumber

- Override base URL:
  BASE_URL=http://localhost:8081 npm run test:cucumber

Features live in tests/e2e/features and steps in tests/e2e/steps.

