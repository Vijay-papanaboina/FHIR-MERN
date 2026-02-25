import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { connectMongo } from './config/db.js';
import { verifyFhirConnection } from './config/fhir.js';
import { auth, initAuth } from './config/auth.js';
import { logger } from './utils/logger.js';
import { jsend } from './utils/jsend.js';
import { AppError } from './utils/AppError.js';
import { correlationId } from './middleware/correlationId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { globalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import patientRoutes from './routes/patient.routes.js';

const app = express();
const port = env.PORT;

// ── Security headers ────────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// ── Correlation ID & Request Logger ─────────────────────────────
app.use(correlationId);
app.use(requestLogger);

// ── Better-Auth (before express.json — it parses its own body) ──
let authHandler: ReturnType<typeof toNodeHandler>;
app.use('/api/auth', authLimiter);
app.all('/api/auth/{*any}', (req, res) => {
  if (!authHandler) authHandler = toNodeHandler(auth);
  return authHandler(req, res);
});

// ── Rate limiter & body parser ──────────────────────────────────
app.use(globalLimiter);
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json(jsend.success({ message: 'Hello from FHIR Backend!' }));
});

app.use('/api/patients', patientRoutes);

// ── 404 catch-all ───────────────────────────────────────────────
app.all('/{*any}', (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

// ── Global error handler (must be last) ─────────────────────────
app.use(errorHandler);

// ── Startup ─────────────────────────────────────────────────────
const startServer = async () => {
  await connectMongo();
  initAuth();
  await verifyFhirConnection();

  app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
