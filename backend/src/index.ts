import express from 'express';
import { env } from './config/env.js';
import { connectMongo } from './config/db.js';
import { verifyFhirConnection } from './config/fhir.js';
import { logger } from './utils/logger.js';

const app = express();
const port = env.PORT;

app.get('/', (req, res) => {
  res.send('Hello from FHIR Backend!');
});

const startServer = async () => {
  await connectMongo();
  await verifyFhirConnection();

  app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
  });
};

startServer();
