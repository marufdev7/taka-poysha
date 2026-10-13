import crypto from 'crypto';

/**
 * Cryptographic PIN Hashing using scrypt + 16-byte random salt.
 * Formats hash as "salt:derivedKeyHex".
 */
export function hashPin(pin: string): string {
  const cleanPin = pin.trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(cleanPin, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Timing-safe PIN verification against stored hash or fallback legacy plaintext.
 */
export function verifyPin(pin: string, storedPinOrHash: string | null | undefined): boolean {
  if (!storedPinOrHash) return false;
  const cleanPin = pin.trim();

  // If already hashed with format "salt:derivedKey"
  if (storedPinOrHash.includes(':')) {
    const [salt, key] = storedPinOrHash.split(':');
    if (!salt || !key) return false;
    try {
      const derivedKey = crypto.scryptSync(cleanPin, salt, 64);
      const derivedBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
      const storedBuffer = Buffer.from(key, 'hex');

      if (derivedBuffer.length !== storedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(derivedBuffer, storedBuffer);
    } catch {
      return false;
    }
  }

  // Backward compatibility: If stored PIN is legacy plaintext
  return storedPinOrHash === cleanPin;
}

/**
 * Detects if a stored PIN is legacy plaintext and needs re-hashing.
 */
export function needsRehash(storedPinOrHash: string | null | undefined): boolean {
  if (!storedPinOrHash) return false;
  return !storedPinOrHash.includes(':');
}

/**
 * Rate limiting state for brute-force attack prevention.
 * Max 5 failed attempts per user/IP within a 15-minute window.
 */
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkRateLimit(key: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMinutes?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (record && record.lockedUntil) {
    if (now < record.lockedUntil) {
      const retryAfterMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return { allowed: false, remainingAttempts: 0, retryAfterMinutes };
    } else {
      loginAttempts.delete(key);
    }
  }

  const attempts = record?.attempts || 0;
  return { allowed: true, remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts) };
}

export function recordFailedAttempt(key: string): {
  locked: boolean;
  remainingAttempts: number;
  retryAfterMinutes?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(key) || { attempts: 0, lockedUntil: null };
  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    loginAttempts.set(key, record);
    return {
      locked: true,
      remainingAttempts: 0,
      retryAfterMinutes: Math.ceil(LOCKOUT_DURATION_MS / 60000),
    };
  }

  loginAttempts.set(key, record);
  return {
    locked: false,
    remainingAttempts: MAX_ATTEMPTS - record.attempts,
  };
}

export function clearRateLimit(key: string) {
  loginAttempts.delete(key);
}
