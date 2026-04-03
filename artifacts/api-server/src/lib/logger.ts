import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  // In production only emit warnings and errors — info/debug chatter wastes
  // memory (string allocation + I/O buffering) and floods Heroku log drains.
  level: process.env.LOG_LEVEL ?? (isProduction ? "warn" : "info"),
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
