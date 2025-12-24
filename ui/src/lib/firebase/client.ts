// filepath: c:\projects\gsdta\gsdta-web\ui\src\lib\firebase\client.ts
"use client";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

// Read config from public env vars
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Debug: Log emulator config on load
if (typeof window !== 'undefined') {
  console.log('[Firebase Config]', {
    projectId: firebaseConfig.projectId,
    authEmulator: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulator: process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST,
  });
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    // Guard against missing env in non-firebase mode
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
      throw new Error("Firebase config env vars are missing. Set NEXT_PUBLIC_FIREBASE_* in .env.local");
    }
    console.log(`[Firebase] Initializing app with project: ${firebaseConfig.projectId}`);
    appInstance = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);

    // Connect to Auth emulator if configured (only once)
    if (!authEmulatorConnected) {
      const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
      if (authEmulatorHost) {
        const url = authEmulatorHost.startsWith('http')
          ? authEmulatorHost
          : `http://${authEmulatorHost}`;
        connectAuthEmulator(authInstance, url, { disableWarnings: true });
        authEmulatorConnected = true;
        console.log(`[Firebase] Connected to Auth emulator: ${url}`);
      } else {
        console.log(`[Firebase] No Auth emulator configured, using production Firebase`);
      }
    }
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    dbInstance = getFirestore(app);

    // Connect to Firestore emulator if configured (only once)
    if (!firestoreEmulatorConnected) {
      const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
      if (firestoreEmulatorHost) {
        const [host, portStr] = firestoreEmulatorHost.split(':');
        const port = parseInt(portStr || '8890', 10);
        connectFirestoreEmulator(dbInstance, host!, port);
        firestoreEmulatorConnected = true;
        console.log(`[Firebase] Connected to Firestore emulator: ${host}:${port}`);
      }
    }
  }
  return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();

