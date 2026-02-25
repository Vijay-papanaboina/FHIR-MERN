import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const myFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (stack) {
        log += `\n${stack}`;
    }
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
        log += ` ${JSON.stringify(meta)}`;
    }
    return log;
});

const isTTY = process.stdout.isTTY ?? false;

export const logger = winston.createLogger({
    level: 'info',
    silent: process.env['NODE_ENV'] === 'test',
    format: combine(
        errors({ stack: true }),
        ...(isTTY ? [colorize()] : []),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        myFormat
    ),
    transports: [
        new winston.transports.Console()
    ]
});
