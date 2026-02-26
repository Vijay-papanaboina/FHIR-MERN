import type { Response } from "express";
import { logger } from "../utils/logger.js";

/**
 * SSE Connection Manager
 *
 * In-memory registry of open SSE connections.
 * Stores userId → Response[] to support multiple tabs per user.
 * If the server restarts, all connections drop and clients reconnect.
 */

/** Shape of an SSE event payload */
export interface SseEvent {
  event: string;
  data: unknown;
}

const connections = new Map<string, Response[]>();
const MAX_CONNECTIONS_PER_USER = 5;

/**
 * Register a new SSE connection for a user.
 * Multiple connections per user are supported (multi-tab).
 */
export const addConnection = (userId: string, res: Response): void => {
  const existing = connections.get(userId) ?? [];

  if (existing.length >= MAX_CONNECTIONS_PER_USER) {
    logger.warn(
      `SSE: user ${userId} exceeded max connections (${MAX_CONNECTIONS_PER_USER}), rejecting`,
    );
    res.write(`event: error\n`);
    res.write(
      `data: ${JSON.stringify({ message: "Too many open connections" })}\n\n`,
    );
    res.end();
    return;
  }

  existing.push(res);
  connections.set(userId, existing);
  logger.info(`SSE: user ${userId} connected (${existing.length} active)`);
};

/**
 * Remove a specific SSE connection for a user (e.g. on disconnect).
 * Splices only that response out of the array.
 */
export const removeConnection = (userId: string, res: Response): void => {
  const existing = connections.get(userId);
  if (!existing) return;

  const index = existing.indexOf(res);
  if (index !== -1) {
    existing.splice(index, 1);
  }

  if (existing.length === 0) {
    connections.delete(userId);
    logger.info(`SSE: user ${userId} fully disconnected`);
  } else {
    logger.info(
      `SSE: user ${userId} tab disconnected (${existing.length} remaining)`,
    );
  }
};

/**
 * Format and write an SSE event to a response stream.
 */
const writeEvent = (res: Response, event: SseEvent): boolean => {
  try {
    res.write(`event: ${event.event}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    return true;
  } catch (err) {
    logger.warn(
      `SSE writeEvent failed: %s`,
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
};

/**
 * Send an SSE event to all connections of a specific user.
 */
export const sendToUser = (userId: string, event: SseEvent): void => {
  const userConns = connections.get(userId);
  if (!userConns) return;

  for (const res of userConns) {
    writeEvent(res, event);
  }
};

/**
 * Send an SSE event to all connections of multiple users at once.
 * This is the primary method used by the alert engine.
 */
export const sendToUsers = (userIds: string[], event: SseEvent): void => {
  for (const userId of userIds) {
    sendToUser(userId, event);
  }
};

/**
 * Get the number of currently connected users (for diagnostics).
 */
export const getConnectionCount = (): number => connections.size;
