import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();
  let logged = false;

  const logRequest = () => {
    if (logged) return;
    logged = true;

    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    logger[level]("request", {
      method: req.method,
      path: req.originalUrl,
      status,
      duration: `${duration}ms`,
      correlationId: req.id,
    });
  };

  res.on("finish", logRequest);
  res.on("close", logRequest);

  next();
};
