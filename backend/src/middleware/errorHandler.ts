import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { jsend } from '../utils/jsend.js';
import { logger } from '../utils/logger.js';

/**
 * Global error-handling middleware.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * - Operational errors (AppError): returns the error message to the client.
 * - Unknown errors: returns a generic "Internal Server Error" (never leaks internals).
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    // ── Log the full error ──────────────────────────────────────
    logger.error(`${err.message}`, {
        stack: err.stack,
        correlationId: req.id,
        method: req.method,
        path: req.originalUrl,
    });

    // ── Guard: don't send if response already started ───────────
    if (res.headersSent) {
        next(err);
        return;
    }

    // ── Operational (expected) errors ───────────────────────────
    if (err instanceof AppError) {
        const { statusCode, status, message } = err;

        if (status === 'fail') {
            res.status(statusCode).json(jsend.fail({ message }));
            return;
        }

        res.status(statusCode).json(jsend.error(message));
        return;
    }

    // ── Unknown / programming errors ────────────────────────────
    res.status(500).json(jsend.error('Internal Server Error'));
};
