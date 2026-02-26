import type { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { addConnection, removeConnection } from "../services/sse.manager.js";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * GET /api/alerts/stream
 * Opens a persistent SSE connection for the authenticated user.
 * Practitioners and admins only.
 */
export const sseStreamHandler = (req: Request, res: Response): void => {
  if (!req.user?.id) {
    throw new AppError("Authentication required", 401);
  }

  const userId = req.user.id;

  // ── SSE headers ────────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Register this connection
  addConnection(userId, res);

  // Send initial event so the client knows the stream is live
  res.write(`event: connected\n`);
  res.write(
    `data: ${JSON.stringify({ message: "SSE connection established" })}\n\n`,
  );

  // Heartbeat to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, HEARTBEAT_INTERVAL_MS);

  // Clean up on disconnect or error
  const cleanup = () => {
    clearInterval(heartbeat);
    removeConnection(userId, res);
  };

  req.on("close", cleanup);
  req.on("error", (err) => {
    logger.warn(`SSE error for user ${userId}: ${err.message}`);
    cleanup();
  });
};
