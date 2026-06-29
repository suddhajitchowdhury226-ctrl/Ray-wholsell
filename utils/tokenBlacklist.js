/**
 * JWT Token Blacklist
 *
 * Uses an in-memory Map as the primary store so the server works with zero
 * external dependencies.  When REDIS_URL is set in .env the same operations
 * are mirrored to Redis so the blacklist survives restarts and works across
 * multiple server instances.
 *
 * TTL is derived from the token's own `exp` claim so entries are never kept
 * longer than necessary.
 */
const jwt = require('jsonwebtoken');
const logger = require('./logger');

// ── In-memory store ──────────────────────────────────────────────────────────
// Map<jti_or_token_hash, expiresAtMs>
const memoryStore = new Map();

// Periodically sweep expired entries so the Map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of memoryStore) {
    if (expiresAt <= now) memoryStore.delete(key);
  }
}, 5 * 60 * 1000); // every 5 minutes

// ── Optional Redis client ────────────────────────────────────────────────────
let redisClient = null;

if (process.env.REDIS_URL) {
  const { createClient } = require('redis');
  redisClient = createClient({ url: process.env.REDIS_URL });

  redisClient.on('error', (err) => {
    logger.error('Redis client error', { message: err.message });
  });

  redisClient.connect().then(() => {
    logger.info('Redis connected for token blacklist');
  }).catch((err) => {
    logger.error('Redis connection failed — falling back to in-memory blacklist', { message: err.message });
    redisClient = null;
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive a stable key from the token.
 * Prefer the `jti` claim if present; otherwise use the token's signature
 * segment (last part after the final dot) which is unique per token.
 */
function tokenKey(token) {
  try {
    const payload = jwt.decode(token);
    if (payload && payload.jti) return `bl:jti:${payload.jti}`;
  } catch (_) { /* ignore */ }
  // Fallback: use the signature portion of the JWT
  const parts = token.split('.');
  return `bl:sig:${parts[parts.length - 1]}`;
}

/**
 * Returns the number of seconds until the token expires.
 * Returns 0 if the token is already expired or cannot be decoded.
 */
function ttlSeconds(token) {
  try {
    const payload = jwt.decode(token);
    if (!payload || !payload.exp) return 0;
    const remaining = payload.exp - Math.floor(Date.now() / 1000);
    return Math.max(0, remaining);
  } catch (_) {
    return 0;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a token to the blacklist.
 * Called on logout.
 */
async function blacklistToken(token) {
  const key = tokenKey(token);
  const ttl = ttlSeconds(token);
  if (ttl <= 0) return; // already expired — nothing to blacklist

  const expiresAtMs = Date.now() + ttl * 1000;

  // Always write to memory store
  memoryStore.set(key, expiresAtMs);

  // Mirror to Redis when available
  if (redisClient) {
    try {
      await redisClient.set(key, '1', { EX: ttl });
    } catch (err) {
      logger.error('Redis blacklist write failed', { message: err.message });
    }
  }
}

/**
 * Check whether a token has been blacklisted.
 * Returns true if the token is revoked.
 */
async function isBlacklisted(token) {
  const key = tokenKey(token);

  // Check Redis first (authoritative when available)
  if (redisClient) {
    try {
      const val = await redisClient.get(key);
      if (val !== null) return true;
    } catch (err) {
      logger.error('Redis blacklist read failed — falling back to memory', { message: err.message });
    }
  }

  // Fall back to in-memory store
  const expiresAtMs = memoryStore.get(key);
  if (!expiresAtMs) return false;
  if (expiresAtMs <= Date.now()) {
    memoryStore.delete(key); // lazy cleanup
    return false;
  }
  return true;
}

module.exports = { blacklistToken, isBlacklisted };
