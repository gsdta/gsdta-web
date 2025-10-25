// filepath: c:\projects\gsdta\gsdta-web\ui\src\lib\firebase\client.ts
"use client";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

// Read config from public env vars
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    // Guard against missing env in non-firebase mode
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
      throw new Error("Firebase config env vars are missing. Set NEXT_PUBLIC_FIREBASE_* in .env.local");
    }
    appInstance = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const googleProvider = new GoogleAuthProvider();

