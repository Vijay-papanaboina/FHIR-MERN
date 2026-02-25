import { rateLimit } from 'express-rate-limit';

// Global rate limiter for non-auth routes
export const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 100,              // 100 requests per window per IP
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ipv6Subnet: 56,
    message: { status: 'error', message: 'Too many requests, please try again later.' },
});

// Stricter rate limiter for auth routes (login, signup, etc.)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20,                // 20 requests per window per IP
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ipv6Subnet: 56,
    message: { status: 'error', message: 'Too many auth requests, please try again later.' },
});
