import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('request', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            correlationId: req.id,
        });
    });

    next();
};
