import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  'taka-poysha-secure-secret-key-bangladesh-2026-production';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const SESSION_COOKIE_NAME = 'tp_auth_session';

/**
 * Creates an HMAC-SHA256 signed session token for a user.
 */
export function createSessionToken(userId: string, role: string = 'MEMBER'): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${userId}:${role}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

/**
 * Verifies the validity and expiration of a session token.
 */
export function verifySessionToken(token: string | null | undefined): {
  valid: boolean;
  userId?: string;
  role?: string;
} {
  if (!token) return { valid: false };
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false };

    const [userId, role, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      return { valid: false };
    }

    const payload = `${userId}:${role}:${expiresAtStr}`;
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return { valid: false };
    }

    return { valid: true, userId, role };
  } catch {
    return { valid: false };
  }
}

/**
 * Extracts and verifies the authenticated user from cookies or Authorization header.
 */
export async function getAuthenticatedUser(request?: Request) {
  let token: string | undefined;

  // 1. Check HttpOnly cookie
  try {
    const cookieStore = cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    // If running in an environment where cookies() throws or outside SSR
  }

  // 2. Check Authorization Header if cookie is not present
  if (!token && request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  // 3. Verify token
  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.userId) {
    return null;
  }

  // 4. Fetch user from DB
  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    include: {
      memberships: {
        include: {
          household: true,
        },
      },
    },
  });

  if (!user) return null;

  const role = user.memberships[0]?.role || verified.role || 'MEMBER';
  const householdId = user.memberships[0]?.householdId || null;

  return {
    user,
    userId: user.id,
    role,
    householdId,
    household: user.memberships[0]?.household || null,
  };
}
