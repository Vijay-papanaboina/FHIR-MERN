import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { connectMongo } from './config/db.js';
import { verifyFhirConnection } from './config/fhir.js';
import { auth, initAuth } from './config/auth.js';
import { logger } from './utils/logger.js';

const app = express();
const port = env.PORT;

// Better-Auth handler MUST be mounted before express.json()
// auth is assigned after initAuth() runs in startServer()
app.all('/api/auth/{*any}', (req, res) => {
  return toNodeHandler(auth)(req, res);
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from FHIR Backend!');
});

const startServer = async () => {
  await connectMongo();
  initAuth();
  await verifyFhirConnection();

  app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
  });
};

startServer();
