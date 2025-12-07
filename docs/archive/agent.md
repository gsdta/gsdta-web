# GSDTA UI Agent — Implementation Plan & Tech Stack

## Purpose

This document outlines the autonomous agent approach for building the GSDTA UI independently of backend and infrastructure readiness.

## Tech Stack (Locked)

- Next.js (React, TypeScript)
- Tailwind CSS
- MSW (API mocking)
- OIDC (Auth0/Keycloak/GIP; fallback: Firebase Auth)
- Jest, React Testing Library, Playwright
- GitHub Actions (CI/CD)
- GCS + Cloud CDN (deployment)

## Stack Versions and Conventions (Pinned)

- Runtime: Node.js 20 LTS (or 22 LTS once CI is ready)
- Package manager: pnpm 9.x (fallback to npm if pnpm unavailable in local)
- Framework: Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Styling: Tailwind CSS 4.x, PostCSS via @tailwindcss/postcss
- Testing: Jest 29.x, React Testing Library 14.x, Playwright 1.48+
- Lint/Format: ESLint 9.x (flat config, next/core-web-vitals), Prettier 3.x
- API Mocking: MSW 2.x
- Forms & Validation: react-hook-form 7.x + zod 3.x
- Utilities: date-fns 3.x, clsx 2.x
- Accessibility: prefer native semantics; use testing-library a11y queries

Conventions

- App Router, server components by default; mark interactive components with `"use client"`.
- Feature-first foldering under `src/features/*` with colocated components, hooks, and tests.
- Type-safe boundaries: define zod schemas for request/response shapes; infer TS types from schemas.
- Environment config: only `NEXT_PUBLIC_*` used in the UI. No secrets in the client.
- Commit style: Conventional Commits enforced with commitlint; pre-commit hooks run lint, typecheck, and unit tests on changed files.

## Project Structure (UI)

- src/app/(public)/\* — marketing/public routes (home, login)
- src/app/(app)/\* — authenticated shell and role-based routes
- src/features/{auth,students,enrollment,classes,attendance,events,announcements,reports}
- src/components/\* — shared UI primitives
- src/lib/\* — helpers (api client, fetch wrappers, date, zod utils)
- src/mocks/\* — MSW handlers, fixtures, server/browser setups
- src/styles/\* — Tailwind globals and design tokens
- public/\* — static assets
- tests/e2e/\* — Playwright specs

## Approach

- All features implemented with static/mock data and API stubs.
- Authentication and role-based access simulated.
- API contracts documented for backend integration.
- Deployment scripts and CI/CD workflows prepared for handoff.

## Mock API Surface (UI-first contract)

Base URL: `${NEXT_PUBLIC_API_BASE_URL}` (default to `/api` locally via MSW)

- Auth
  - GET /auth/session → { user: { id, role: 'admin'|'teacher'|'parent', name, email } }
  - POST /auth/login → 200 with session; POST /auth/logout
- Users
  - GET /users/me → current profile
- Students
  - GET /students → Student[]; POST /students → create; PATCH /students/:id → update
- Enrollment
  - POST /enrollments → apply; GET /enrollments?status=pending|accepted|waitlisted
  - PATCH /enrollments/:id { status }
- Classes
  - GET /classes → Class[]; GET /classes/:id → details with roster
- Attendance
  - GET /classes/:id/attendance?date=YYYY-MM-DD → records
  - POST /classes/:id/attendance → [{ studentId, status: 'present'|'absent'|'late' }]
- Announcements
  - GET /announcements → list; POST /announcements → create
- Events
  - GET /events → list; POST /events → create; POST /events/:id/register
- Reports (stub)
  - GET /reports/attendance?range=term → { byClass: ..., byStudent: ... }

Entity minimum fields

- Student: { id, firstName, lastName, dob, priorLevel?, medicalNotes?, photoConsent: boolean, guardians: [{ name, phone, email }] }
- Class: { id, level, campus, dayOfWeek, startTime, endTime, capacity }
- Enrollment: { id, studentId, classId?, status: 'pending'|'accepted'|'waitlisted'|'rejected', submittedAt }
- AttendanceRecord: { studentId, date, status }
- Announcement: { id, title, body, audience: 'all'|'parents'|'teachers', publishedAt }
- Event: { id, title, date, location, capacity?, registeredCount }

## Principles

- Accessibility and mobile-first design.
- Performance budgets enforced.
- No backend dependency for UI development.
- Clear API boundaries for future integration.

## Definition of Done (per feature)

- UI implemented with responsive and accessible components (keyboard and screen-reader friendly)
- Forms validated with zod; helpful error messages
- MSW handlers cover happy-path + at least 2 error cases
- Unit tests (Jest) for components and hooks; E2E (Playwright) for flow
- TypeScript passes (no `any` leaks across feature boundary)
- Lighthouse (mobile) performance ≥ 90 for affected pages

## Next Steps

- Scaffold Next.js app and set up MSW.
- Implement all screens and flows with mocked data.
- Document API contracts and deployment steps.
