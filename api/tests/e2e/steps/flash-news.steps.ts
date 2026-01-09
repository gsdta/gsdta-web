import { Given } from '@cucumber/cucumber';
import { adminDb } from '../../../src/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

Given('there is a flash news with id {string}', { timeout: 120000 }, async function (id: string) {
  const db = adminDb();
  const docRef = db.collection('flashNews').doc(id);

  try {
    await docRef.set({
      text: {
        en: 'Test Flash News',
        ta: 'சோதனை செய்தி',
      },
      link: null,
      priority: 50,
      isActive: false,
      startDate: null,
      endDate: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'test-admin',
    });
  } catch (error) {
    console.error('Failed to create flash news:', error);
    throw error;
  }
});

Given('there is an active flash news', { timeout: 30000 }, async function () {
  const db = adminDb();
  const docRef = db.collection('flashNews').doc('active-flash-test');

  const now = Timestamp.now();
  const tomorrow = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  try {
    await docRef.set({
      text: {
        en: 'Active Flash News for Testing',
        ta: 'சோதனைக்கான செயலில் உள்ள செய்தி',
      },
      link: 'https://example.com',
      priority: 80,
      isActive: true,
      startDate: now,
      endDate: tomorrow,
      createdAt: now,
      updatedAt: now,
      createdBy: 'test-admin',
    });
  } catch (error) {
    console.error('Failed to create active flash news:', error);
    throw error;
  }
});

Given('there is an inactive flash news with id {string}', { timeout: 30000 }, async function (id: string) {
  const db = adminDb();
  const docRef = db.collection('flashNews').doc(id);

  const now = Timestamp.now();

  try {
    await docRef.set({
      text: {
        en: 'Inactive Flash News',
        ta: 'செயலற்ற செய்தி',
      },
      link: null,
      priority: 30,
      isActive: false,
      startDate: null,
      endDate: null,
      createdAt: now,
      updatedAt: now,
      createdBy: 'test-admin',
    });
  } catch (error) {
    console.error('Failed to create inactive flash news:', error);
    throw error;
  }
});
