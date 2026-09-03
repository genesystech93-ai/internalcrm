/**
 * In-Memory Rate Limiter for Login & Authentication
 * Mitigates automated brute-force attacks and credential stuffing.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function checkLoginRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now > record.resetTime) {
    loginAttempts.set(identifier, { count: 0, resetTime: now + WINDOW_MS });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count, retryAfterSeconds: 0 };
}

export function recordFailedLoginAttempt(identifier: string): void {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now > record.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
  } else {
    record.count += 1;
  }
}

export function resetLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}
