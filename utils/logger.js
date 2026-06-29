/**
 * Structured Winston logger — never logs PII (emails, tokens, IDs, roles).
 * Use logger.info / logger.warn / logger.error throughout the codebase.
 * Pass a `meta` object with safe, non-PII context fields only.
 */
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, errors, json, colorize, simple } = format;

const isProduction = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: isProduction ? 'warn' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Always write errors to a dedicated file
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),
    // Combined log for all levels
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ],
  // Do not exit on handled exceptions
  exitOnError: false,
});

// In development, also print human-readable output to the console
if (!isProduction) {
  logger.add(
    new transports.Console({
      format: combine(colorize(), simple()),
    })
  );
}

module.exports = logger;
