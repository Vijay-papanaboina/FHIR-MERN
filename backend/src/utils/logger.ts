import winston from "winston";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const nodeEnv = process.env["NODE_ENV"];
const isDev = nodeEnv === "development";

const prettyFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
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

/**
 * Build the winston formats based on environment and TTY status.
 */
function buildFormats() {
  if (isDev) {
    return [...(isTTY ? [colorize()] : []), prettyFormat];
  }
  return [json()];
}

export const logger = winston.createLogger({
  level: process.env["LOG_LEVEL"]?.toLowerCase() || (isDev ? "debug" : "info"),
  silent: nodeEnv === "test",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: () => new Date().toISOString() }),
    ...buildFormats(),
  ),
  transports: [new winston.transports.Console()],
});
