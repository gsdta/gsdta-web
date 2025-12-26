# GSDTA Mobile App

React Native mobile app for GSDTA Tamil School Management, built with Expo and sharing business logic with the web app.

## Architecture Overview

This mobile app is part of a monorepo that shares code with the web application:

```
gsdta-web/
├── packages/
│   ├── shared-core/        # Shared business logic (API, types, validation)
│   └── shared-firebase/    # Shared Firebase auth interfaces
├── ui/                     # Next.js web app
├── api/                    # Backend API
└── mobile/                 # This React Native app
```

### Code Sharing

The mobile app reuses ~70-80% of business logic from `@gsdta/shared-core`:
- All API functions (students, classes, profile, etc.)
- Type definitions and Zod validation schemas
- Platform adapter pattern for storage/auth/network

## Project Structure

```
mobile/
├── app/                    # Expo Router file-based routing
│   ├── _layout.tsx         # Root layout (auth provider, platform init)
│   ├── (auth)/             # Auth screens (login)
│   └── (tabs)/             # Main app tabs (dashboard, students, classes, profile)
├── src/
│   ├── platform/
│   │   └── adapter.ts      # Mobile PlatformAdapter (AsyncStorage, Firebase)
│   └── auth/
│       └── provider.tsx    # Firebase auth context
├── components/             # Reusable UI components
├── constants/              # App constants (colors, etc.)
├── assets/                 # Images, fonts
├── metro.config.js         # Bundler config for monorepo
└── app.json                # Expo configuration
```

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm 10+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator
- Firebase project with Authentication enabled

### 1. Install Dependencies

From the monorepo root:
```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp mobile/.env.example mobile/.env
```

Edit `mobile/.env` with your Firebase configuration:
```env
# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.qa.gsdta.com

# Firebase Configuration (from Firebase Console > Project Settings)
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Google OAuth Client IDs (from Firebase Console > Authentication > Google)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
```

### 3. Firebase Setup

#### Add Mobile Apps to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., `gsdta-qa`)
3. Click "Add app" and add:
   - **iOS app**: Bundle ID `com.gsdta.mobile`
   - **Android app**: Package name `com.gsdta.mobile`

#### Download Config Files (for native builds)

For development builds with native Firebase:
- iOS: Download `GoogleService-Info.plist` → place in `mobile/ios/`
- Android: Download `google-services.json` → place in `mobile/android/`

**Note:** For Expo Go development, config files are not required - Firebase JS SDK is used instead.

#### Enable Google Sign-In

1. Firebase Console > Authentication > Sign-in method
2. Enable "Google" provider
3. Note the Web client ID for `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
4. For iOS/Android client IDs:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - APIs & Services > Credentials
   - Find OAuth 2.0 Client IDs for iOS and Android

### 4. Run the App

#### Development with Expo Go

```bash
cd mobile
npx expo start
```

Scan the QR code with:
- iOS: Camera app → tap the notification
- Android: Expo Go app

#### iOS Simulator (macOS only)

```bash
npx expo run:ios
```

#### Android Emulator

```bash
npx expo run:android
```

## Features

### Authentication
- Google Sign-In (via expo-auth-session)
- Email/Password sign-in
- Protected routes with automatic redirect

### Screens

| Screen | Description | API Used |
|--------|-------------|----------|
| Dashboard | Welcome + quick actions | - |
| Students | List of enrolled students | `getMyStudents()` |
| Classes | Class list (teachers/admins only) | `adminGetClasses()` |
| Profile | User info + sign out | `getProfile()` |

### Role-Based Access

- **Parents**: Dashboard, Students, Profile
- **Teachers/Admins**: Dashboard, Students, Classes, Profile

## Development

### TypeScript Check

```bash
cd mobile
npx tsc --noEmit
```

### Adding New Screens

1. Create file in `app/` directory (Expo Router file-based routing)
2. Import shared APIs from `@gsdta/shared-core`
3. Use `useAuth()` hook for authentication state

Example:
```typescript
import { useEffect, useState } from 'react';
import { getMyStudents, StudentListItem } from '@gsdta/shared-core';

export default function MyScreen() {
  const [data, setData] = useState<StudentListItem[]>([]);

  useEffect(() => {
    getMyStudents().then(setData);
  }, []);

  // ... render
}
```

### Workspace Packages

The app uses npm workspaces. Shared packages are symlinked:
- `@gsdta/shared-core` → `packages/shared-core`
- `@gsdta/shared-firebase` → `packages/shared-firebase`

Metro bundler is configured in `metro.config.js` to resolve these.

## Troubleshooting

### "Platform not initialized" Error

Ensure `initializeMobilePlatform()` is called in `app/_layout.tsx` before any API calls.

### Firebase Auth Issues

1. Check `.env` file has correct Firebase config
2. Verify Firebase project has Authentication enabled
3. For Google Sign-In, ensure client IDs are correct for each platform

### Metro Bundler Cache

Clear cache if you see stale code:
```bash
npx expo start --clear
```

### Workspace Resolution Issues

If shared packages aren't found:
```bash
# From monorepo root
rm -rf node_modules mobile/node_modules
npm install
```
