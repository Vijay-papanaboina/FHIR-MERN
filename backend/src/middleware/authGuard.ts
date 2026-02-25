import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { AppError } from '../utils/AppError.js';

type AuthSession = typeof auth.$Infer.Session;

/**
 * Auth guard middleware.
 * Verifies the user has a valid Better-Auth session.
 * Attaches `req.user` and `req.authSession` for downstream handlers.
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
        throw new AppError('Authentication required', 401);
    }

    req.user = session.user;
    req.authSession = session.session;
    next();
};

// Extend Express Request with Better-Auth session data (inferred types include custom fields)
declare global {
    namespace Express {
        interface Request {
            user?: AuthSession['user'];
            authSession?: AuthSession['session'];
        }
    }
}
