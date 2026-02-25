# Frontend (FHIR MERN)

The React client for the FHIR MERN application. It provides a modern interface for viewing and managing FHIR (Fast Healthcare Interoperability Resources) healthcare data.

## Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Data Fetching**: `@tanstack/react-query`
- **Routing**: React Router v7
- **Forms & Validation**: React Hook Form + Zod
- **Icons**: Lucide React

## Key Features

- **Dashboard**: View recent patient records and vital signs metrics.
- **Authentication**: Email/password and OAuth (Google) support using Better Auth client.
- **Patient Detail**: Access detailed patient information including history and observations.
- **Vitals Tracking**: Add and visualize basic vitals (e.g., Blood Pressure, Heart Rate) via Recharts.

## Development setup

From the `frontend` directory:

```bash
# Start development server
npm run dev

# Run type checks and build
npm run build
```

## Environment Variables

Ensure the backend server is running and accessible to the frontend. Create the frontend environment configuration by copying the example template (`cp .env.example .env`) and add the default `VITE_API_URL` value (e.g., `VITE_API_URL=http://localhost:3000`). This default can be overridden in your local `.env` file.
