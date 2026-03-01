# Frontend (FHIR MERN)

React + Vite client for the clinical dashboard and patient portal.

This README is frontend-specific. For repo-level setup/workflow, use the root `README.md`.

## Stack

- React 19 + Vite
- React Router v7
- TanStack Query
- Tailwind CSS v4 + shadcn/ui
- Better Auth client
- Zustand (alerts state)
- Vitest + Testing Library

## App Areas

- `/dashboard/*`: admin and practitioner clinical experience
- `/portal/*`: patient experience
- Role-aware route guards and redirects
- Real-time alert flow via SSE for clinical staff

## Setup

From `frontend/`:

```bash
npm install
npm run dev
```

Recommended first-time setup from repo root:

```bash
npm install
```

This installs all workspace dependencies and enables Husky hooks.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:watch
npm run test:coverage
```

## Environment

Copy `.env.example` to `.env` and set:

```bash
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` should point to the backend API origin.

## Testing Notes

- Unit-style tests are colocated with source files (`src/**`).
- DOM/hook tests use `// @vitest-environment jsdom`.
- Shared test setup is in `src/test/setup.ts`.

## Local Quality Gates

From repo root:

```bash
npm run check:commit
npm run check:push
```

Backend/infrastructure details remain in `backend/README.md` and root `README.md`.
