# Backend (FHIR MERN)

The Express backend for the FHIR MERN application. It serves as an API gateway, handling authentication and interfacing between the frontend client and the underlying HAPI FHIR server.

## Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript (running via `tsx` for development)
- **Database**: MongoDB (via Mongoose)
- **Authentication**: Better Auth
- **Validation**: Zod
- **External API Interaction**: Standard HTTP requests to the HAPI FHIR server (HL7 FHIR specification)

## Key Features

- **User Authentication**: Email/password and social login support via Better Auth.
- **Patient Management**: Fetching and searching patient records from the FHIR server.
- **Vitals Management**: Recording and retrieving patient vitals (Observation resources).

## Initializing FHIR Data

The backend includes a script to seed the HAPI FHIR server with initial test data. Ensure your FHIR server is running via Docker Compose first.

```bash
# Ensure you are in the backend directory
npm run dev    # (Optional) keep the backend running in Terminal 1
```

In a new terminal (Terminal 2), run the seed script:

```bash
npx tsx scripts/seed-fhir.ts
```

## Useful Commands

- `npm run dev`: Starts the development server with hot-reloading using `tsx watch`.
- `npm run build`: Compiles the TypeScript application, emitting the output into the `dist/` directory for production.
- `npm run start`: Runs the compiled application in production mode using `node dist/backend/src/index.js`.
