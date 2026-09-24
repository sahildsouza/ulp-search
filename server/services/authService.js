import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const ACCESS_CODE_FILE = path.join(ROOT_DIR, '.access_code');
const SECRET_KEY_FILE = path.join(ROOT_DIR, '.session_secret');

// Brute-force protection constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes lockout
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes sliding window

// In-memory rate limiting map: ip -> { failedAttempts, lockedUntil, attempts: [] }
const ipRateLimits = new Map();

// In-memory active tokens: token -> { expiresAt, createdAt, ip }
const activeTokens = new Map();

/**
 * Loads or initializes persistent session secret for HMAC signatures
 */
function getSessionSecret() {
  try {
    if (fs.existsSync(SECRET_KEY_FILE)) {
      const secret = fs.readFileSync(SECRET_KEY_FILE, 'utf-8').trim();
      if (secret.length >= 32) return secret;
    }
  } catch {}

  const newSecret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(SECRET_KEY_FILE, newSecret, { mode: 0o600 });
  } catch {}
  return newSecret;
}

const SESSION_SECRET = getSessionSecret();

/**
 * Retrieves the configured access code from ENV or .access_code file,
 * or generates a secure default if none exists.
 */
export function getOrInitializeAccessCode() {
  // 1. Check environment variable
  if (process.env.ACCESS_CODE && process.env.ACCESS_CODE.trim().length > 0) {
    return process.env.ACCESS_CODE.trim();
  }

  // 2. Check persistent .access_code file
  try {
    if (fs.existsSync(ACCESS_CODE_FILE)) {
      const savedCode = fs.readFileSync(ACCESS_CODE_FILE, 'utf-8').trim();
      if (savedCode.length > 0) {
        return savedCode;
      }
    }
  } catch {}

  // 3. Generate a secure, user-friendly access code (e.g. ULP-8823-9142)
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  const generatedCode = `ULP-${part1}-${part2}`;

  try {
    fs.writeFileSync(ACCESS_CODE_FILE, generatedCode, { mode: 0o600 });
  } catch {}

  return generatedCode;
}

// Current master access code
let currentAccessCode = getOrInitializeAccessCode();

export function getActiveAccessCode() {
  return currentAccessCode;
}

export function setCustomAccessCode(newCode) {
  if (!newCode || typeof newCode !== 'string' || newCode.trim().length < 4) {
    throw new Error('Access code must be at least 4 characters long');
  }
  currentAccessCode = newCode.trim();
  try {
    fs.writeFileSync(ACCESS_CODE_FILE, currentAccessCode, { mode: 0o600 });
  } catch {}
  // Invalidate all existing tokens on password change
  activeTokens.clear();
  return currentAccessCode;
}

/**
 * Timing-safe string comparison to prevent side-channel timing attacks
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Normalizes client IP address from Fastify request
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Checks rate limit status for an IP
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const record = ipRateLimits.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS, lockedUntil: null, lockoutSeconds: 0 };
  }

  // Check if currently locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const lockoutSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: record.lockedUntil,
      lockoutSeconds
    };
  }

  // Clean old attempts outside the sliding window
  record.attempts = record.attempts.filter(t => now - t < ATTEMPT_WINDOW_MS);
  record.lockedUntil = null;

  const failedCount = record.attempts.length;
  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failedCount);

  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    lockedUntil: null,
    lockoutSeconds: 0
  };
}

/**
 * Records a failed login attempt
 */
export function recordFailedAttempt(ip) {
  const now = Date.now();
  let record = ipRateLimits.get(ip);

  if (!record) {
    record = { attempts: [], lockedUntil: null };
    ipRateLimits.set(ip, record);
  }

  record.attempts.push(now);
  record.attempts = record.attempts.filter(t => now - t < ATTEMPT_WINDOW_MS);

  if (record.attempts.length >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    return {
      locked: true,
      lockoutSeconds: Math.ceil(LOCKOUT_WINDOW_MS / 1000),
      remainingAttempts: 0
    };
  }

  return {
    locked: false,
    lockoutSeconds: 0,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts.length)
  };
}

/**
 * Clears rate limiting on successful login
 */
export function recordSuccessfulAttempt(ip) {
  ipRateLimits.delete(ip);
}

/**
 * Generates a signed session token
 */
export function createSessionToken(ip, rememberMe = false) {
  const tokenId = crypto.randomBytes(24).toString('hex');
  const durationMs = rememberMe ? (30 * 24 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000); // 30 days vs 24h
  const expiresAt = Date.now() + durationMs;

  const payload = `${tokenId}.${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');

  const fullToken = `${payload}.${signature}`;

  activeTokens.set(fullToken, {
    expiresAt,
    createdAt: Date.now(),
    ip
  });

  // Periodically clean expired tokens
  if (activeTokens.size > 1000) {
    const now = Date.now();
    for (const [t, meta] of activeTokens.entries()) {
      if (meta.expiresAt < now) activeTokens.delete(t);
    }
  }

  return {
    token: fullToken,
    expiresAt,
    durationMs
  };
}

/**
 * Validates a session token
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [tokenId, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    activeTokens.delete(token);
    return false;
  }

  // Verify HMAC signature
  const expectedPayload = `${tokenId}.${expiresAtStr}`;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(expectedPayload)
    .digest('hex');

  if (!timingSafeCompare(signature, expectedSignature)) {
    return false;
  }

  // Verify in-memory presence
  const session = activeTokens.get(token);
  if (!session) return false;

  return true;
}

/**
 * Revokes a session token
 */
export function revokeSessionToken(token) {
  if (token && typeof token === 'string') {
    activeTokens.delete(token);
  }
}

/**
 * Extracts auth token from Fastify request (Header, Cookie, or Query)
 */
export function extractAuthToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }

  const customHeader = req.headers['x-access-token'];
  if (customHeader && typeof customHeader === 'string') {
    return customHeader.trim();
  }

  // Query parameter fallback for SSE EventSource / direct links
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
}
