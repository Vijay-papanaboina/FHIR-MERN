import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { jsend } from "./utils/jsend.js";
import { AppError } from "./utils/AppError.js";
import { correlationId } from "./middleware/correlationId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import patientRoutes from "./routes/patient.routes.js";
import vitalsRoutes from "./routes/vitals.routes.js";
import authRoutes from "./routes/auth.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import userRoutes from "./routes/user.routes.js";
import portalRoutes from "./routes/portal.routes.js";
import medicationRoutes from "./routes/medication.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import conditionRoutes from "./routes/condition.routes.js";
import allergyRoutes from "./routes/allergy.routes.js";

export const createApp = () => {
  const app = express();

  // ── Security headers ────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // ── Correlation ID & Request Logger ─────────────────────────────
  app.use(correlationId);
  app.use(requestLogger);

  // ── Better-Auth Routes (before express.json — it parses its own body) ──
  app.use("/api/auth", authRoutes);

  // ── Rate limiter & body parser ──────────────────────────────────
  app.use(globalLimiter);
  app.use(
    express.json({ type: ["application/json", "application/fhir+json"] }),
  );

  // ── Routes ──────────────────────────────────────────────────────
  app.get("/", (req, res) => {
    res.json(jsend.success({ message: "Hello from FHIR Backend!" }));
  });

  app.use("/api/patients", patientRoutes);
  app.use("/api/patients/:id/vitals", vitalsRoutes);
  app.use("/api/patients/:patientFhirId/medications", medicationRoutes);
  app.use("/api/patients/:patientFhirId/appointments", appointmentRoutes);
  app.use("/api/patients/:patientFhirId/conditions", conditionRoutes);
  app.use("/api/patients/:patientFhirId/allergies", allergyRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/alerts", alertRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/portal", portalRoutes);

  // ── 404 catch-all ───────────────────────────────────────────────
  app.all("/{*any}", (req, res, next) => {
    next(
      new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404),
    );
  });

  // ── Global error handler (must be last) ─────────────────────────
  app.use(errorHandler);

  return app;
};
