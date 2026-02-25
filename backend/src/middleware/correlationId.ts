import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

const SAFE_ID_PATTERN = /^(?!.*[\r\n])[a-zA-Z0-9\-_.]{1,128}$/;

export const correlationId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const incoming = req.headers["x-request-id"];
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;
  const id = raw && SAFE_ID_PATTERN.test(raw) ? raw : uuidv4();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};

// Extend Express Request type to include `id`
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}
