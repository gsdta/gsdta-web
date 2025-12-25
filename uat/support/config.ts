import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface Config {
  // Base URL
  baseUrl: string;

  // Browser settings
  headless: boolean;
  slowMo: number;

  // Firebase
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;

  // Test users
  adminEmail: string;
  adminPassword: string;
  teacherEmail: string;
  teacherPassword: string;
  parentEmail: string;
  parentPassword: string;
}

export function getConfig(): Config {
  return {
    baseUrl: process.env.UAT_BASE_URL || 'https://app.qa.gsdta.com',
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO || '0', 10),

    firebaseApiKey: process.env.FIREBASE_API_KEY || '',
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || 'gsdta-qa.firebaseapp.com',
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'gsdta-qa',

    adminEmail: process.env.UAT_ADMIN_EMAIL || '',
    adminPassword: process.env.UAT_ADMIN_PASSWORD || '',
    teacherEmail: process.env.UAT_TEACHER_EMAIL || '',
    teacherPassword: process.env.UAT_TEACHER_PASSWORD || '',
    parentEmail: process.env.UAT_PARENT_EMAIL || '',
    parentPassword: process.env.UAT_PARENT_PASSWORD || '',
  };
}

/**
 * Validate that all required environment variables are set
 */
export function validateConfig(config: Config): void {
  const required = [
    'baseUrl',
    'firebaseApiKey',
    'adminEmail',
    'adminPassword',
  ];

  const missing = required.filter((key) => !config[key as keyof Config]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file or environment configuration.'
    );
  }
}
