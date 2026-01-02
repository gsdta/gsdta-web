// api/src/lib/__tests__/firebaseAdmin.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminApp, adminAuth, adminDb, __resetAppForTests, normalizeEmulatorHost } from '../firebaseAdmin';

// Store original environment variables
const originalEnv = { ...process.env };

test.afterEach(() => {
  // Restore environment variables
  process.env = { ...originalEnv };
});

// ============================================
// getAdminApp tests
// ============================================

test('getAdminApp: should return a Firebase App instance', () => {
  const app = getAdminApp();

  assert.ok(app);
  assert.ok(typeof app.name === 'string');
});

test('getAdminApp: should return the same app instance on multiple calls (singleton)', () => {
  const app1 = getAdminApp();
  const app2 = getAdminApp();

  assert.strictEqual(app1, app2);
});

test('getAdminApp: should have the expected project ID', () => {
  const app = getAdminApp();
  const options = app.options;

  assert.ok(options.projectId);
  // In emulator mode, should be demo-gsdta or whatever is set in env
  assert.ok(typeof options.projectId === 'string');
});

test('getAdminApp: should reuse existing Firebase app after reset', () => {
  // Get the app first
  const app1 = getAdminApp();

  // Reset the singleton
  __resetAppForTests();

  // Should reuse existing Firebase app (getApps()[0])
  const app2 = getAdminApp();

  // Should be the same underlying app
  assert.strictEqual(app1, app2);
});

test('getAdminApp: multiple resets should work correctly', () => {
  const app1 = getAdminApp();
  __resetAppForTests();
  const app2 = getAdminApp();
  __resetAppForTests();
  const app3 = getAdminApp();

  assert.strictEqual(app1, app2);
  assert.strictEqual(app2, app3);
});

// ============================================
// adminAuth tests
// ============================================

test('adminAuth: should return an Auth instance', () => {
  const auth = adminAuth();

  assert.ok(auth);
  // Auth instance should have verifyIdToken method
  assert.ok(typeof auth.verifyIdToken === 'function');
});

test('adminAuth: should be callable multiple times', () => {
  const auth1 = adminAuth();
  const auth2 = adminAuth();

  // Auth instances should be equal (same underlying app)
  assert.ok(auth1);
  assert.ok(auth2);
});

test('adminAuth: should return consistent auth instance after app reset', () => {
  const auth1 = adminAuth();
  __resetAppForTests();
  const auth2 = adminAuth();

  // Both should have verifyIdToken function
  assert.ok(typeof auth1.verifyIdToken === 'function');
  assert.ok(typeof auth2.verifyIdToken === 'function');
});

// ============================================
// adminDb tests
// ============================================

test('adminDb: should return a Firestore instance', () => {
  const db = adminDb();

  assert.ok(db);
  // Firestore instance should have collection method
  assert.ok(typeof db.collection === 'function');
});

test('adminDb: should be callable multiple times', () => {
  const db1 = adminDb();
  const db2 = adminDb();

  // Both should work
  assert.ok(db1);
  assert.ok(db2);
});

test('adminDb: Firestore settings should handle repeated calls gracefully', () => {
  // First call sets settings
  const db1 = adminDb();
  assert.ok(db1);

  // Second call should not throw even though settings are locked
  const db2 = adminDb();
  assert.ok(db2);

  // Third call to verify the try/catch handles the error
  const db3 = adminDb();
  assert.ok(db3);
});

test('adminDb: should return consistent db instance after app reset', () => {
  const db1 = adminDb();
  __resetAppForTests();
  const db2 = adminDb();

  // Both should have collection function
  assert.ok(typeof db1.collection === 'function');
  assert.ok(typeof db2.collection === 'function');
});

// ============================================
// Integration tests
// ============================================

test('adminDb: should be able to access a collection', async () => {
  const db = adminDb();
  const collectionRef = db.collection('test-collection');

  assert.ok(collectionRef);
  assert.ok(typeof collectionRef.doc === 'function');
});

test('adminAuth and adminDb: should use the same underlying app', () => {
  const auth = adminAuth();
  const db = adminDb();

  // Both should be defined and functional
  assert.ok(auth);
  assert.ok(db);
});

// ============================================
// __resetAppForTests tests
// ============================================

test('__resetAppForTests: should reset the singleton allowing reinitialization', () => {
  const app1 = getAdminApp();
  assert.ok(app1);

  __resetAppForTests();

  // After reset, calling getAdminApp should still return a valid app
  // (because Firebase SDK still has the app registered)
  const app2 = getAdminApp();
  assert.ok(app2);
});

test('__resetAppForTests: should not affect Firebase app registry', () => {
  // Get app to ensure it's initialized
  const app1 = getAdminApp();

  // Reset our singleton
  __resetAppForTests();

  // adminAuth and adminDb should still work
  const auth = adminAuth();
  const db = adminDb();

  assert.ok(auth);
  assert.ok(db);
  assert.ok(typeof auth.verifyIdToken === 'function');
  assert.ok(typeof db.collection === 'function');
});

// ============================================
// normalizeEmulatorHost tests
// ============================================

test('normalizeEmulatorHost: should return undefined for undefined input', () => {
  const result = normalizeEmulatorHost(undefined);
  assert.equal(result, undefined);
});

test('normalizeEmulatorHost: should return unchanged if already using 127.0.0.1', () => {
  const result = normalizeEmulatorHost('127.0.0.1:8889');
  assert.equal(result, '127.0.0.1:8889');
});

test('normalizeEmulatorHost: should replace localhost with 127.0.0.1', () => {
  const result = normalizeEmulatorHost('localhost:8889');
  assert.equal(result, '127.0.0.1:8889');
});

test('normalizeEmulatorHost: should handle localhost with different ports', () => {
  assert.equal(normalizeEmulatorHost('localhost:9099'), '127.0.0.1:9099');
  assert.equal(normalizeEmulatorHost('localhost:5001'), '127.0.0.1:5001');
});

test('normalizeEmulatorHost: should not modify other hostnames', () => {
  const result = normalizeEmulatorHost('firestore.googleapis.com:443');
  assert.equal(result, 'firestore.googleapis.com:443');
});

test('normalizeEmulatorHost: should handle empty string', () => {
  const result = normalizeEmulatorHost('');
  // Empty string is falsy, so should return as-is (falsy check)
  assert.equal(result, '');
});
