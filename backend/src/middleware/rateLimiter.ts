import { rateLimit } from 'express-rate-limit';

// Global rate limiter for non-auth routes
export const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 100,              // 100 requests per window per IP
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' },
});
