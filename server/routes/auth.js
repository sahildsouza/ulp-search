import {
  getActiveAccessCode,
  setCustomAccessCode,
  timingSafeCompare,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  createSessionToken,
  verifySessionToken,
  revokeSessionToken,
  extractAuthToken
} from '../services/authService.js';

export async function authRoutes(fastify, options) {
  // Public: Check auth status and rate limit state
  fastify.get('/api/auth/status', async (req, reply) => {
    const ip = getClientIp(req);
    const rateStatus = checkRateLimit(ip);
    const token = extractAuthToken(req);
    const isAuthenticated = verifySessionToken(token);

    return {
      requiresAuth: true,
      authenticated: isAuthenticated,
      locked: !rateStatus.allowed,
      lockoutSeconds: rateStatus.lockoutSeconds,
      remainingAttempts: rateStatus.remainingAttempts
    };
  });

  // Public: Authenticate with access code
  fastify.post('/api/auth/login', async (req, reply) => {
    const ip = getClientIp(req);
    const rateStatus = checkRateLimit(ip);

    if (!rateStatus.allowed) {
      reply.code(429);
      return {
        error: 'Too many failed login attempts.',
        message: `Security lockout active. Please wait ${rateStatus.lockoutSeconds} seconds before trying again.`,
        locked: true,
        lockoutSeconds: rateStatus.lockoutSeconds,
        remainingAttempts: 0
      };
    }

    const { code, rememberMe } = req.body || {};

    if (!code || typeof code !== 'string') {
      reply.code(400);
      return { error: 'Access code is required' };
    }

    const masterCode = getActiveAccessCode();
    const isValid = timingSafeCompare(code.trim(), masterCode);

    if (!isValid) {
      // Artificial delay (400ms) to throttle brute-force automation
      await new Promise(r => setTimeout(r, 400));
      const failStatus = recordFailedAttempt(ip);

      if (failStatus.locked) {
        reply.code(429);
        return {
          error: 'Maximum attempts exceeded.',
          message: `Too many incorrect attempts. Locked out for ${failStatus.lockoutSeconds} seconds.`,
          locked: true,
          lockoutSeconds: failStatus.lockoutSeconds,
          remainingAttempts: 0
        };
      }

      reply.code(401);
      return {
        error: 'Invalid access code.',
        message: 'The access code provided does not match.',
        remainingAttempts: failStatus.remainingAttempts,
        locked: false
      };
    }

    // Success! Clear failed attempts
    recordSuccessfulAttempt(ip);

    // Issue cryptographic session token
    const session = createSessionToken(ip, Boolean(rememberMe));

    return {
      success: true,
      message: 'Access granted.',
      token: session.token,
      expiresAt: session.expiresAt
    };
  });

  // Authenticated: Logout / Revoke token
  fastify.post('/api/auth/logout', async (req, reply) => {
    const token = extractAuthToken(req);
    if (token) {
      revokeSessionToken(token);
    }
    return { success: true, message: 'Logged out successfully.' };
  });

  // Authenticated: Change access code
  fastify.post('/api/auth/change-code', async (req, reply) => {
    const token = extractAuthToken(req);
    if (!verifySessionToken(token)) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    const { newCode } = req.body || {};
    if (!newCode || typeof newCode !== 'string' || newCode.trim().length < 6) {
      reply.code(400);
      return { error: 'New access code must be at least 6 characters long' };
    }

    try {
      const updated = setCustomAccessCode(newCode);
      return { success: true, message: 'Access code updated successfully.', newCode: updated };
    } catch (err) {
      reply.code(400);
      return { error: err.message };
    }
  });
}
