# Mobile Architecture Plan: GSDTA Web + Mobile

## Overview

This document outlines the architecture for sharing code between the GSDTA web application (Next.js) and a future mobile application (React Native/Expo).

**Goal:** Maximize code reuse (~70-80% of business logic) while maintaining platform-specific optimizations.

---

## Monorepo Structure

```
gsdta-web/
├── packages/
│   ├── shared-core/           # Platform-agnostic logic
│   │   └── src/
│   │       ├── api/           # API client + domain modules
│   │       ├── types/         # TypeScript + Zod schemas
│   │       ├── utils/         # Pure utilities (icsGenerator, etc.)
│   │       ├── i18n/          # Translation messages
│   │       └── platform/      # Platform adapter interfaces
│   │
│   └── shared-firebase/       # Firebase abstractions (future)
│       └── src/
│           ├── auth/          # Auth interface definitions
│           └── storage/       # Storage interface definitions
│
├── ui/                        # Next.js web app
│   └── src/
│       └── platform/          # Web platform adapters
│
├── mobile/                    # React Native app (future)
│   └── src/
│       └── platform/          # Mobile platform adapters
│
├── api/                       # Backend API
└── scripts/                   # Build scripts
```

---

## Shared Packages

### `@gsdta/shared-core`

Platform-agnostic business logic that works on both web and mobile.

| Content | Description | Reusability |
|---------|-------------|-------------|
| `types/*.ts` | TypeScript interfaces + Zod schemas | 100% |
| `api/*.ts` | API client and domain modules | 95% |
| `utils/*.ts` | Pure utility functions | 100% |
| `i18n/*.ts` | Translation messages | 100% |
| `platform/*.ts` | Platform adapter interfaces | 100% |

### Files Extracted from `ui/src/lib/`

| Original | Shared Location |
|----------|-----------------|
| `student-types.ts` | `shared-core/src/types/student.ts` |
| `attendance-types.ts` | `shared-core/src/types/attendance.ts` |
| `class-api.ts` | `shared-core/src/types/class.ts` |
| `enrollment-types.ts` | `shared-core/src/types/enrollment.ts` |
| `grade-types.ts` | `shared-core/src/types/grade.ts` |
| `parent-types.ts` | `shared-core/src/types/parent.ts` |
| `textbook-types.ts` | `shared-core/src/types/textbook.ts` |
| `volunteer-types.ts` | `shared-core/src/types/volunteer.ts` |
| `auth-types.ts` | `shared-core/src/types/auth.ts` |
| `api-client.ts` | `shared-core/src/api/client.ts` |
| `student-api.ts` | `shared-core/src/api/student.ts` |
| `icsGenerator.ts` | `shared-core/src/utils/icsGenerator.ts` |

---

## Dependency Injection Pattern

The shared code uses dependency injection to handle platform differences (storage, auth, network).

### Platform Adapter Interface

```typescript
// packages/shared-core/src/platform/types.ts
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface AuthTokenProvider {
  getToken(): Promise<string | null>;
}

export interface NetworkAdapter {
  fetch: typeof globalThis.fetch;
  baseUrl: string;
}

export interface PlatformAdapter {
  storage: StorageAdapter;
  auth: AuthTokenProvider;
  network: NetworkAdapter;
}
```

### Web Implementation

```typescript
// ui/src/platform/adapter.ts
const webAdapter: PlatformAdapter = {
  storage: {
    get: async (key) => sessionStorage.getItem(key),
    set: async (key, value) => sessionStorage.setItem(key, value),
    remove: async (key) => sessionStorage.removeItem(key),
  },
  auth: {
    getToken: async () => firebaseAuth.currentUser?.getIdToken() ?? null,
  },
  network: {
    fetch: globalThis.fetch.bind(globalThis),
    baseUrl: '/api',
  },
};
```

### Mobile Implementation (Future)

```typescript
// mobile/src/platform/adapter.ts
const mobileAdapter: PlatformAdapter = {
  storage: {
    get: AsyncStorage.getItem,
    set: AsyncStorage.setItem,
    remove: AsyncStorage.removeItem,
  },
  auth: {
    getToken: async () => auth().currentUser?.getIdToken() ?? null,
  },
  network: {
    fetch: globalThis.fetch.bind(globalThis),
    baseUrl: 'https://api.gsdta.org/api',
  },
};
```

---

## Migration Phases

### Phase 1: Foundation (Current)
- [x] Create `packages/` directory structure
- [x] Initialize `shared-core` package
- [x] Create `PlatformAdapter` interface
- [ ] Extract type definitions
- [ ] Update root `package.json` workspaces

### Phase 2: API Layer Migration
- [ ] Refactor `api-client.ts` with dependency injection
- [ ] Create web platform adapter
- [ ] Move API modules to `shared-core`
- [ ] Update UI imports
- [ ] Verify all tests pass

### Phase 3: Firebase Abstractions
- [ ] Define auth interfaces in `shared-firebase`
- [ ] Refactor `AuthProvider.tsx`
- [ ] Extract i18n messages

### Phase 4: Mobile App Bootstrap
- [ ] Initialize Expo project
- [ ] Implement mobile platform adapters
- [ ] Build initial screens

---

## Mobile Framework

**Recommendation: React Native with Expo**

| Feature | Benefit |
|---------|---------|
| TypeScript support | Same language as web |
| npm workspaces | Shared packages work directly |
| Expo Router | Similar to Next.js App Router |
| EAS Build | Cloud builds for iOS & Android |
| React Native Firebase | Matches existing patterns |

### Build Capabilities

| Platform | Output | Requirements |
|----------|--------|--------------|
| Android | `.apk` / `.aab` | None (cloud build) |
| iOS | `.ipa` | Apple Developer ($99/year) |

---

## Usage

### Installing shared packages

```bash
# From project root
npm install

# Packages are linked automatically via workspaces
```

### Importing from shared-core

```typescript
// In ui/src/...
import { Student, createStudentSchema } from '@gsdta/shared-core/types';
import { createStudent, getMyStudents } from '@gsdta/shared-core/api';
```

### Building packages

```bash
# Build shared packages first
npm run build -w packages/shared-core

# Then build apps
npm run build:ui
```

---

## Code Reusability Summary

| Category | Shared | Platform-Specific |
|----------|--------|-------------------|
| Type definitions | Yes | - |
| Zod validation | Yes | - |
| API functions | Yes | - |
| i18n messages | Yes | - |
| Utilities | Yes | - |
| UI components | - | Yes |
| Routing | - | Yes |
| Styling | - | Yes |
| Storage | Interface | Implementation |
| Auth | Interface | Implementation |

**Estimated shared code:** ~3,200 lines across 20 files (70-80% of business logic)
