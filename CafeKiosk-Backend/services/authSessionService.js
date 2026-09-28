'use strict';

const crypto = require('crypto');
const pool = require('../config/dbPool');

const SESSION_HOURS = Math.min(168, Math.max(1, Number(process.env.AUTH_SESSION_HOURS || 8)));

function newSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function clientIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req?.ip || req?.socket?.remoteAddress || '').trim() || null;
}

async function ensureSessionSchema(connection = pool) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id VARCHAR(255) PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash VARCHAR(255) NULL,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      KEY idx_sessions_user_expiry (user_id, expires_at),
      KEY idx_sessions_active (session_id, revoked_at, expires_at),
      CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}

async function createSession(user, req, connection = pool) {
  const userId = Number(user?.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    const error = new Error('A database-backed user is required for a secure session.');
    error.code = 'DATABASE_USER_REQUIRED';
    throw error;
  }

  await ensureSessionSchema(connection);
  const sessionId = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await connection.execute(
    `INSERT INTO user_sessions
      (session_id, user_id, token_hash, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at)
     VALUES (?, ?, NULL, ?, ?, NOW(), NOW(), ?, NULL)`,
    [
      sessionId,
      userId,
      clientIp(req),
      String(req?.get?.('user-agent') || req?.headers?.['user-agent'] || '').slice(0, 1000) || null,
      expiresAt
    ]
  );
  return { sessionId, expiresAt };
}

async function attachTokenHash(sessionId, token, connection = pool) {
  if (!sessionId || !token) return;
  await connection.execute(
    'UPDATE user_sessions SET token_hash=? WHERE session_id=? AND revoked_at IS NULL',
    [tokenHash(token), sessionId]
  );
}

async function revokeSession(sessionId, userId = null, connection = pool) {
  if (!sessionId) return 0;
  const params = [sessionId];
  let sql = 'UPDATE user_sessions SET revoked_at=COALESCE(revoked_at, NOW()) WHERE session_id=?';
  if (Number.isFinite(Number(userId)) && Number(userId) > 0) {
    sql += ' AND user_id=?';
    params.push(Number(userId));
  }
  const [result] = await connection.execute(sql, params);
  return Number(result?.affectedRows || 0);
}

async function revokeAllUserSessions(userId, connection = pool) {
  const numeric = Number(userId);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  await ensureSessionSchema(connection);
  const [result] = await connection.execute(
    'UPDATE user_sessions SET revoked_at=COALESCE(revoked_at, NOW()) WHERE user_id=? AND revoked_at IS NULL',
    [numeric]
  );
  return Number(result?.affectedRows || 0);
}

module.exports = {
  SESSION_HOURS,
  ensureSessionSchema,
  createSession,
  attachTokenHash,
  revokeSession,
  revokeAllUserSessions
};
