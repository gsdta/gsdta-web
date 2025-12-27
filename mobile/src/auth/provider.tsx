import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
  sendEmailVerification as firebaseSendEmailVerification,
  connectAuthEmulator,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthUser, Role, MeApiResponse } from '@gsdta/shared-firebase';
import { setMobileAuthTokenGetter } from '../platform/adapter';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check if Google Sign-In is configured
const isGoogleConfigured = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
);

// API base URL
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.gsdta.com';

// Firebase Auth Emulator (for local development)
const FIREBASE_AUTH_EMULATOR_HOST =
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isGoogleAvailable: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Fetch user profile from API
 */
async function fetchUserProfile(token: string): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/me/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user profile:', response.status);
      return null;
    }

    const meData = (await response.json()) as MeApiResponse;

    // Map API response to AuthUser
    const roles = meData.roles as Role[];
    return {
      id: meData.uid,
      email: meData.email,
      name: meData.name || meData.email,
      role: roles[0] || 'parent',
      roles,
      emailVerified: meData.emailVerified,
      authProvider: 'password', // Will be updated based on actual provider
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);

  // Initialize Google auth request
  // Provide dummy values when not configured to prevent hook from crashing
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'not-configured',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'not-configured.apps.googleusercontent.com',
  });

  // Initialize Firebase
  useEffect(() => {
    let app: FirebaseApp;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    // Connect to Auth Emulator in development
    if (FIREBASE_AUTH_EMULATOR_HOST) {
      const auth = getAuth(app);
      try {
        connectAuthEmulator(auth, `http://${FIREBASE_AUTH_EMULATOR_HOST}`, {
          disableWarnings: true,
        });
        console.log('Connected to Firebase Auth Emulator:', FIREBASE_AUTH_EMULATOR_HOST);
      } catch (e) {
        // Emulator already connected (happens on hot reload)
        console.log('Auth emulator already connected');
      }
    }

    setFirebaseApp(app);
  }, []);

  // Set up auth state listener
  useEffect(() => {
    if (!firebaseApp) return;

    const auth = getAuth(firebaseApp);

    // Set up token getter for platform adapter
    setMobileAuthTokenGetter(async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      return currentUser.getIdToken();
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const profile = await fetchUserProfile(token);
          if (profile) {
            // Determine auth provider
            const providerData = firebaseUser.providerData[0];
            if (providerData?.providerId === 'google.com') {
              profile.authProvider = 'google';
            } else {
              profile.authProvider = 'password';
            }
            setUser(profile);
          } else {
            // Fallback user from Firebase if API fails
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email || '',
              role: 'parent',
              roles: ['parent'],
              emailVerified: firebaseUser.emailVerified,
            });
          }
        } catch (err) {
          console.error('Error during auth state change:', err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseApp]);

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.idToken) {
      const { idToken } = response.authentication;
      const credential = GoogleAuthProvider.credential(idToken);
      const auth = getAuth(firebaseApp!);
      signInWithCredential(auth, credential).catch((err) => {
        console.error('Google sign-in error:', err);
        setError('Google sign-in failed');
      });
    }
  }, [response, firebaseApp]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!isGoogleConfigured) {
      setError('Google Sign-In is not configured. Use email/password instead.');
      return;
    }
    if (!request) {
      setError('Google Sign-In is not available');
      return;
    }
    await promptAsync();
  }, [request, promptAsync]);

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (!firebaseApp) {
        setError('Firebase not initialized');
        return;
      }

      setError(null);
      try {
        const auth = getAuth(firebaseApp);
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Sign-in failed';
        console.error('Email sign-in error:', err);
        setError(errorMessage);
        throw err;
      }
    },
    [firebaseApp]
  );

  const signOut = useCallback(async () => {
    if (!firebaseApp) return;

    try {
      const auth = getAuth(firebaseApp);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }, [firebaseApp]);

  const sendEmailVerification = useCallback(async () => {
    if (!firebaseApp) return;

    const auth = getAuth(firebaseApp);
    const currentUser = auth.currentUser;
    if (currentUser) {
      await firebaseSendEmailVerification(currentUser);
    }
  }, [firebaseApp]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isGoogleAvailable: isGoogleConfigured,
        signInWithGoogle,
        signInWithEmailPassword,
        signOut,
        sendEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
