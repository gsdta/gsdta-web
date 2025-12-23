import { Given } from '@cucumber/cucumber';
import { adminDb } from '../../../src/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { testDataTracker } from '../support/testDataTracker';

Given('there is a flash news with id {string}', { timeout: 120000 }, async function (id: string) {
  const db = adminDb();
  const newsRef = db.collection('flashNews').doc(id);
  
  try {
    await newsRef.set({
      id,
      text: {
        en: 'Test flash news',
        ta: 'சோதனை செய்தி',
      },
      linkUrl: null,
      linkText: null,
      isActive: false,
      isUrgent: false,
      priority: 10,
      startDate: null,
      endDate: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'test-admin',
    });
    testDataTracker.track('flashNews', id);
  } catch (error) {
    console.error('Failed to create flash news:', error);
    throw error;
  }
});

Given('there is an active flash news', { timeout: 30000 }, async function () {
  const db = adminDb();
  const newsRef = db.collection('flashNews').doc('active-test-flash');
  
  const now = Timestamp.now();
  const tomorrow = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  
  try {
    await newsRef.set({
      id: 'active-test-flash',
      text: {
        en: 'Active flash news for testing',
        ta: 'சோதனைக்கான செயலில் உள்ள செய்தி',
      },
      linkUrl: null,
      linkText: null,
      isActive: true,
      isUrgent: false,
      priority: 10,
      startDate: now,
      endDate: tomorrow,
      createdAt: now,
      updatedAt: now,
      createdBy: 'test-admin',
    });
    testDataTracker.track('flashNews', 'active-test-flash');
  } catch (error) {
    console.error('Failed to create active flash news:', error);
    throw error;
  }
});

Given('there is an expired flash news', { timeout: 30000 }, async function () {
  const db = adminDb();
  const newsRef = db.collection('flashNews').doc('expired-test-flash');
  
  const yesterday = Timestamp.fromDate(new Date(Date.now() - 48 * 60 * 60 * 1000));
  const lastWeek = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  
  try {
    await newsRef.set({
      id: 'expired-test-flash',
      text: {
        en: 'Expired flash news',
        ta: 'காலாவதியான செய்தி',
      },
      linkUrl: null,
      linkText: null,
      isActive: true, // Active but expired by date
      isUrgent: false,
      priority: 5,
      startDate: lastWeek,
      endDate: yesterday, // Ended yesterday
      createdAt: lastWeek,
      updatedAt: lastWeek,
      createdBy: 'test-admin',
    });
    testDataTracker.track('flashNews', 'expired-test-flash');
  } catch (error) {
    console.error('Failed to create expired flash news:', error);
    throw error;
  }
});

Given('there is an urgent flash news', { timeout: 30000 }, async function () {
  const db = adminDb();
  const newsRef = db.collection('flashNews').doc('urgent-test-flash');
  
  const now = Timestamp.now();
  const tomorrow = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  
  try {
    await newsRef.set({
      id: 'urgent-test-flash',
      text: {
        en: 'URGENT: School closed due to weather!',
        ta: 'அவசரம்: வானிலை காரணமாக பள்ளி மூடப்பட்டது!',
      },
      linkUrl: null,
      linkText: null,
      isActive: true,
      isUrgent: true,
      priority: 100,
      startDate: now,
      endDate: tomorrow,
      createdAt: now,
      updatedAt: now,
      createdBy: 'test-admin',
    });
    testDataTracker.track('flashNews', 'urgent-test-flash');
  } catch (error) {
    console.error('Failed to create urgent flash news:', error);
    throw error;
  }
});
