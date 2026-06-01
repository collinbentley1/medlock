export type RateLimitDecision = {
  readonly allowed: boolean;
  readonly retryAfterSeconds?: number;
};

export class InMemoryRateLimiter {
  readonly #events = new Map<string, number[]>();

  check(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitDecision {
    const cutoff = now - windowMs;
    const retained = (this.#events.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

    if (retained.length >= limit) {
      const oldest = retained[0] ?? now;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      };
    }

    retained.push(now);
    this.#events.set(key, retained);
    return { allowed: true };
  }
}
