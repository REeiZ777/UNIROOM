import pino, { LoggerOptions, LogFn } from "pino";

const emailRegex =
  /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function maskEmails(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(emailRegex, "***@***");
  }

  if (Array.isArray(value)) {
    return value.map(maskEmails);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const masked = Object.create(null) as Record<string, unknown>;
    for (const [key, entryValue] of entries) {
      masked[key] = maskEmails(entryValue);
    }
    return masked;
  }

  return value;
}

const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "headers.authorization",
      "req.headers.authorization",
      "*.password",
      "password",
      "token",
      "*.token",
      "*.email",
    ],
    censor: "[redacted]",
  },
  hooks: {
    logMethod(this: pino.Logger, args, method: LogFn) {
      const normalizedArgs: unknown[] = Array.isArray(args) ? [...args] : [args];
      const masked = normalizedArgs.map(maskEmails);
      if (masked.length === 0) {
        masked.push(undefined);
      }
      return Reflect.apply(method, this, masked);
    },
  },
};

export const logger = pino(loggerOptions);







