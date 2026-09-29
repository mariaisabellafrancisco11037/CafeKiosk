const crypto = require('crypto');

// Short-lived, one-time opaque tickets bridge an already authenticated HTTP
// session into Socket.IO without exposing the real login JWT to JavaScript.
const TICKET_TTL_MS = Math.max(15000, Number(process.env.SOCKET_TICKET_TTL_MS || 45000));
const tickets = new Map();

function digest(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function cleanup(now = Date.now()) {
  for (const [key, record] of tickets.entries()) {
    if (!record || Number(record.expiresAt || 0) <= now) tickets.delete(key);
  }
}

function issue({ user, claims } = {}) {
  cleanup();
  if (!user?.userId || !claims?.sid || !claims?._rawToken) {
    throw new Error('A current database-backed login session is required.');
  }

  const raw = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + TICKET_TTL_MS;
  tickets.set(digest(raw), {
    expiresAt,
    userId: Number(user.userId),
    role: String(user.role || '').toLowerCase(),
    cafeId: String(user.cafeId || ''),
    claims: { ...claims }
  });

  return {
    ticket: raw,
    expiresAt,
    expiresInMs: TICKET_TTL_MS
  };
}

function consume(rawTicket) {
  cleanup();
  const key = digest(rawTicket);
  const record = tickets.get(key);
  if (!record) return null;
  tickets.delete(key); // one connection attempt only
  if (record.expiresAt <= Date.now()) return null;
  return record;
}

module.exports = { issue, consume, cleanup, TICKET_TTL_MS };
