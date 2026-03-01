# FHIR MERN

Monorepo for a full-stack FHIR application with a React frontend, an Express backend, and a shared TypeScript package.

Use this README for repo-level setup and workflow.  
Service-specific details live in:

- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)

## Architecture Overview

```mermaid
flowchart LR
  FE[Frontend]
  FE --> API[Express App]
  API --> MW[Middleware Auth Guard, Role Guard,AssignmentLink Guards, Validation]
  MW --> CTRL[Controllers]
  CTRL --> SVC[Services]
  SVC --> REPO[Repositories]

  REPO <--> MONGO[(MongoDB)]
  REPO <--> FHIR[(HAPI FHIR)]

  FHIR -->|Subscription webhook POST /api/alerts/webhook| API
  API -->|SSE alerts| FE
```

## Request Flow (standard API path)

```mermaid
sequenceDiagram
  participant C as Frontend
  participant A as Express App
  participant M as Middleware
  participant K as Controller
  participant S as Service
  participant R as Repository
  participant D as MongoDB or HAPI FHIR

  C->>A: HTTP request
  A->>M: Auth + role + input guards
  M->>K: Validated request
  K->>S: Business operation
  S->>R: Data/FHIR access call
  R->>D: Query or resource operation
  D-->>R: Result
  R-->>S: Domain data
  S-->>K: DTO/result
  K-->>C: JSend response
```

## Alerting Flow (webhook to SSE)

```mermaid
sequenceDiagram
  participant F as HAPI FHIR
  participant B as Express /api/alerts/webhook
  participant V as verifyWebhookSecret middleware
  participant T as Threshold Evaluator
  participant A as Assignment + Admin lookup
  participant L as Alert Store (MongoDB)
  participant S as SSE Manager
  participant P as Practitioner/Admin Client

  F->>B: Observation webhook POST
  B->>V: Verify X-Webhook-Secret (if configured)
  V-->>B: allowed/rejected
  B->>T: Evaluate observation values
  T-->>B: Alert payload (or null)
  B->>A: Resolve recipients
  A-->>B: Recipient user ids
  B->>L: Persist alert
  L-->>B: Saved alert
  B->>S: sendToUsers(...)
  S-->>P: event: alert
```

## Workspaces

- [`frontend/`](./frontend/README.md) - React + Vite client
- [`backend/`](./backend/README.md) - Express API + Better Auth + MongoDB + FHIR integration
- `shared/` - `@fhir-mern/shared` DTO/types package consumed by frontend and backend

## Prerequisites

- Node.js 20+
- npm 9+
- Docker + Docker Compose

## Start Infrastructure

From repo root:

```bash
docker compose up -d
```

Services expected for local development:

- FHIR gateway at `http://localhost:8080/fhir` (nginx proxy to HAPI)
- MongoDB for backend app data
- PostgreSQL for HAPI FHIR

## Install

From repo root:

```bash
npm install
```

This enables Husky hooks for local quality gates.

## Environment Setup

### Backend

```bash
cd backend
cp .env.example .env
```

### Frontend

```bash
cd frontend
cp .env.example .env
```

Set frontend API URL to backend, for example:

```bash
VITE_API_URL=http://localhost:3000
```

## Run Locally

Use separate terminals.

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

## Quality Gates

From repo root:

```bash
npm run check:commit
npm run check:push
```

Hook behavior:

- `pre-commit`: `lint-staged` + `npm run check:commit`
- `pre-push`: `npm run check:push`

## Service Test Commands

```bash
cd backend
npm run test:unit
npm run test:integration
npm run test:api
npm test
```

```bash
cd frontend
npm run test
```

## Formatting

From repo root:

```bash
npm run format
```

## API Collection

Postman collection is available at:

- `postman/postman_collection.json`
