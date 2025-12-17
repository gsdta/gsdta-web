/**
 * Playwright Test Fixture for Test Data Management
 *
 * This fixture provides automatic test data creation and cleanup.
 * It extends the base Playwright test with a `testData` fixture that:
 * - Creates a TestDataFactory for each test
 * - Automatically cleans up all created entities after each test
 *
 * Usage:
 *   import { test, expect } from '../fixtures/testData.fixture';
 *
 *   test('my test', async ({ page, testData }) => {
 *     const grade = await testData.createGrade({ name: 'Test Grade' });
 *     const student = await testData.createStudentWithStatus({
 *       firstName: 'Test',
 *       lastName: 'Student'
 *     }, 'active');
 *     // ... test code ...
 *     // Cleanup happens automatically
 *   });
 */

import { test as base, expect } from '@playwright/test';
import { TestDataFactory } from '../helpers/testData';

/**
 * Extended test fixtures
 */
interface TestFixtures {
  /**
   * Test data factory for creating and managing test data.
   * Automatically initializes before each test and cleans up after.
   */
  testData: TestDataFactory;
}

/**
 * Extended Playwright test with testData fixture
 */
export const test = base.extend<TestFixtures>({
  testData: async ({}, use, testInfo) => {
    // Create factory with worker index for parallel test isolation
    const workerId = testInfo.workerIndex.toString();
    const factory = new TestDataFactory(workerId);

    // Initialize (login as admin, setup Firestore connection)
    await factory.initialize();

    // Provide factory to test
    await use(factory);

    // Cleanup after test completes (success or failure)
    try {
      await factory.cleanup();
    } catch (error) {
      console.error(`[Worker ${workerId}] Cleanup error:`, error);
      // Don't throw - we don't want cleanup failures to mask test failures
    }

    // Destroy factory (cleanup Firebase app)
    try {
      await factory.destroy();
    } catch (error) {
      console.error(`[Worker ${workerId}] Factory destroy error:`, error);
    }
  },
});

// Re-export expect for convenience
export { expect };

/**
 * Helper type for tests that use the testData fixture
 */
export type TestDataFixtureTest = typeof test;
