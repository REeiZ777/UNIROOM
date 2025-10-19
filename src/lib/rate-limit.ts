type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

const DEFAULT_MESSAGE =
  "Trop de requêtes ont été détectées. Merci de patienter avant de réessayer.";

export class RateLimitError extends Error {
  readonly statusCode = 429;
  readonly resetAt: number;

  constructor(message: string, resetAt: number) {
    super(message);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}

function now() {
  return Date.now();
}

function cleanup(key: string, entry: RateLimitEntry, current = now()) {
  if (entry.expiresAt <= current) {
    store.delete(key);
    return true;
  }
  return false;
}

export function consumeRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const current = now();
  const entry = store.get(key);

  if (!entry || cleanup(key, entry, current)) {
    const expiresAt = current + windowMs;
    store.set(key, { count: 1, expiresAt });
    return {
      success: true,
      remaining: limit - 1,
      resetAt: expiresAt,
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.expiresAt,
    };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.expiresAt,
  };
}

export function enforceRateLimit(
  options: RateLimitOptions,
  message: string = DEFAULT_MESSAGE,
) {
  const result = consumeRateLimit(options);
  if (!result.success) {
    throw new RateLimitError(message, result.resetAt);
  }
  return result;
}
