# FHIR MERN Application

A full-stack application for managing and viewing FHIR (Fast Healthcare Interoperability Resources) data. The project is structured as a monorepo containing a React frontend and an Express Node.js backend.

## Architecture Structure

- **[`frontend/`](./frontend/README.md)**: React 19 application built with Vite, Tailwind CSS v4, and Shadcn UI. Communicates with the backend API to display patient records and vitals.
- **[`backend/`](./backend/README.md)**: Node.js Express server. Handles authentication using Better Auth, proxies and manages interactions with a HAPI FHIR server, and connects to MongoDB for local application data.
- **`shared/`**: Shared TypeScript definitions (`@fhir-mern/shared`) used by both the frontend and backend to ensure type safety across the stack.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (for the databases and FHIR server)
- [Git](https://git-scm.com/)

### 1. Start Infrastructure Services

The application requires a PostgreSQL database (for the HAPI FHIR server), the HAPI FHIR server itself, and a MongoDB instance (for application data).

From the root directory, start the services using Docker Compose:

```bash
docker compose up -d
```

Wait a moment for all services to become healthy. The HAPI FHIR server will be available at `http://localhost:8080/fhir`.

### 2. Install Dependencies

Install dependencies for all workspaces from the root directory:

```bash
npm install
```

### 3. Environment Configuration

Copy the environment variable templates and fill in any required values:

**Backend:**

```bash
cd backend
cp .env.example .env
```

Ensure the `.env` file connects to the local MongoDB (`mongodb://<username>:<password>@localhost:27017/app_db`) and your given FHIR server URL (e.g., `http://localhost:8080/fhir`).

**Frontend:**

```bash
cd frontend
cp .env.example .env
```

Ensure the `.env` file contains the API variable pointing to your backend (e.g., `VITE_API_URL=http://localhost:3000`). If you update the `.env` file while the frontend development server is running, restart the server so the new `VITE_API_URL` is picked up.

### 4. Run the Application

You will need to run the frontend and backend development servers in separate terminal instances.

**Terminal 1 (Backend):**

```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev
```

## Formatting

This monorepo uses Prettier for consistent code formatting.

```bash
# From the root directory
npx prettier --write "frontend/src/**/*.{ts,tsx}" "backend/src/**/*.ts" "shared/**/*.{ts,tsx,js}" "*.{json,md}"
```
