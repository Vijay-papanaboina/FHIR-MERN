/**
 * Custom operational error class for the application.
 *
 * Throw this from controllers/services for expected failures
 * (bad input, not found, unauthorized, etc.).
 * The global error handler will format these into JSend responses.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly status: 'fail' | 'error';
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.isOperational = true;

        // Preserve proper stack trace (only available on V8 engines)
        Error.captureStackTrace(this, this.constructor);
    }
}
