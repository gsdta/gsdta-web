import { Given } from '@cucumber/cucumber';
import { adminDb } from '../../../src/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { testDataTracker } from '../support/testDataTracker';

Given('there is a hero content with id {string}', { timeout: 120000 }, async function (id: string) {
  const db = adminDb();
  const contentRef = db.collection('heroContent').doc(id);
  
  try {
    await contentRef.set({
      id,
      type: 'event',
      title: {
        en: 'Test Event',
        ta: 'சோதனை நிகழ்வு',
      },
      subtitle: {
        en: 'Test subtitle',
        ta: 'சோதனை துணைத்தலைப்பு',
      },
      description: {
        en: 'Test description',
        ta: 'சோதனை விளக்கம்',
      },
      imageUrl: null,
      ctaText: null,
      ctaLink: null,
      startDate: null,
      endDate: null,
      isActive: false,
      priority: 5,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'test-admin',
    });
    testDataTracker.track('heroContent', id);
  } catch (error) {
    console.error('Failed to create hero content:', error);
    throw error;
  }
});

Given('there is an active hero content', { timeout: 30000 }, async function () {
  const db = adminDb();
  const contentRef = db.collection('heroContent').doc('active-test-content');
  
  const now = Timestamp.now();
  const tomorrow = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  
  try {
    await contentRef.set({
      id: 'active-test-content',
      type: 'event',
      title: {
        en: 'Active Event',
        ta: 'செயலில் உள்ள நிகழ்வு',
      },
      subtitle: {
        en: 'Currently active event',
        ta: 'தற்போது செயலில் உள்ள நிகழ்வு',
      },
      imageUrl: null,
      ctaText: null,
      ctaLink: null,
      startDate: now,
      endDate: tomorrow,
      isActive: true,
      priority: 10,
      createdAt: now,
      updatedAt: now,
      createdBy: 'test-admin',
    });
    testDataTracker.track('heroContent', 'active-test-content');
  } catch (error) {
    console.error('Failed to create active hero content:', error);
    throw error;
  }
});
