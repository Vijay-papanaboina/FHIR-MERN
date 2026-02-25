import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const correlationId = (req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string) || uuidv4();
    req.id = id;
    res.setHeader('X-Request-Id', id);
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
