/**
 * Centralized Test Data Tracker for Cucumber Tests
 *
 * This module provides a singleton tracker to track all test data created
 * during Cucumber scenarios. It enables automatic cleanup after each scenario.
 *
 * Usage in step definitions:
 *   import { testDataTracker } from '../support/testDataTracker';
 *
 *   Given('there is a student with id {string}', async function (id: string) {
 *     // Create the entity...
 *     testDataTracker.track('students', id);
 *   });
 *
 * The After hook in hooks.ts calls testDataTracker.cleanup() automatically.
 */

import { adminDb } from '../../../src/lib/firebaseAdmin';

// All Firestore collections that may have test data
type CollectionName =
  | 'students'
  | 'classes'
  | 'grades'
  | 'heroContent'
  | 'invites'
  | 'teacherInvites';

class TestDataTracker {
  private trackedData: Map<CollectionName, Set<string>> = new Map();

  /**
   * Track a document for cleanup
   * @param collection - The Firestore collection name
   * @param id - The document ID
   */
  track(collection: CollectionName, id: string): void {
    if (!this.trackedData.has(collection)) {
      this.trackedData.set(collection, new Set());
    }
    this.trackedData.get(collection)!.add(id);
  }

  /**
   * Track multiple documents for cleanup
   * @param collection - The Firestore collection name
   * @param ids - Array of document IDs
   */
  trackMany(collection: CollectionName, ids: string[]): void {
    for (const id of ids) {
      this.track(collection, id);
    }
  }

  /**
   * Get all tracked IDs for a collection
   * @param collection - The Firestore collection name
   */
  getTracked(collection: CollectionName): string[] {
    return Array.from(this.trackedData.get(collection) || []);
  }

  /**
   * Get count of all tracked entities
   */
  getTrackedCount(): number {
    let count = 0;
    for (const ids of this.trackedData.values()) {
      count += ids.size;
    }
    return count;
  }

  /**
   * Clean up all tracked test data from Firestore
   * Uses batch operations for efficiency
   */
  async cleanup(): Promise<void> {
    const totalCount = this.getTrackedCount();
    if (totalCount === 0) {
      return;
    }

    const db = adminDb();

    // Process each collection
    for (const [collection, ids] of this.trackedData.entries()) {
      if (ids.size === 0) continue;

      const idsArray = Array.from(ids);

      // Firestore batch limit is 500 operations
      const batchSize = 500;
      for (let i = 0; i < idsArray.length; i += batchSize) {
        const batch = db.batch();
        const chunk = idsArray.slice(i, i + batchSize);

        for (const id of chunk) {
          const docRef = db.collection(collection).doc(id);
          batch.delete(docRef);
        }

        try {
          await batch.commit();
        } catch (error) {
          // Log but don't fail - entity may have been deleted by test
          console.warn(`Warning: Failed to cleanup some ${collection} documents:`, error);
        }
      }
    }
  }

  /**
   * Reset the tracker (clear all tracked IDs without deleting from Firestore)
   * Called after cleanup() to prepare for next scenario
   */
  reset(): void {
    this.trackedData.clear();
  }

  /**
   * Check if any data is being tracked
   */
  hasTrackedData(): boolean {
    return this.getTrackedCount() > 0;
  }
}

// Export singleton instance
export const testDataTracker = new TestDataTracker();

// Export type for use in step definitions
export type { CollectionName };
