// ============================================================
// CAFEKIOSK SERVER-SIDE AUTHENTICATION
//
// SECURITY MODEL
// - Authentication credentials live only in HttpOnly cookies.
// - Browser localStorage/sessionStorage is never proof of identity.
// - X-Cafe-Role only selects which role-specific HttpOnly cookie to use;
//   it never grants that role.
// - Every protected request re-checks the live MySQL user, cafe, role,
//   approval state, and revocable server-side session.
// - Production fails closed when the authentication schema/database cannot
//   be verified.
// ============================================================

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const dbPool = require('../config/dbPool');
const { JWT_SECRET } = require('../config/security');

const COOKIE_NAMES = {
  admin: 'cafe_admin_token',
  manager: 'cafe_manager_token',
  staff: 'cafe_staff_token'
};

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  String(cookieHeader).split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index === -1) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return;
    try { cookies[key] = decodeURIComponent(value); }
    catch (_) { cookies[key] = value; }
  });
  return cookies;
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function verifyJwt(token) {
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); }
  catch (_) { return null; }
}

function tokenDigest(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function safeEqualText(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Retained only for compatibility with modules that import the helper.
// Cafe user authentication intentionally does NOT consume Bearer tokens.
function getBearerToken(req) {
  const authorization = String(req.headers?.authorization || '');
  if (!authorization.toLowerCase().startsWith('bearer ')) return '';
  return authorization.slice(7).trim();
}

function getRoleCookieToken(req, role) {
  const cookies = parseCookies(req.headers?.cookie);
  const cookieName = COOKIE_NAMES[normalizeRole(role)];
  return cookieName ? String(cookies[cookieName] || '') : '';
}

function requestedRoleSelector(req) {
  const role = normalizeRole(req.headers?.['x-cafe-role']);
  return COOKIE_NAMES[role] ? role : '';
}

function decodeRequestUser(req, preferredRoles = []) {
  const normalizedPreferred = preferredRoles.map(normalizeRole).filter((role) => COOKIE_NAMES[role]);
  const selected = requestedRoleSelector(req);
  const order = [];

  for (const role of normalizedPreferred) if (!order.includes(role)) order.push(role);
  if (selected && !order.includes(selected)) order.push(selected);
  for (const role of ['admin', 'manager', 'staff']) if (!order.includes(role)) order.push(role);

  for (const role of order) {
    const rawToken = getRoleCookieToken(req, role);
    const claims = verifyJwt(rawToken);
    if (claims) return { ...claims, _cookieRole: role, _rawToken: rawToken };
  }
  return null;
}

function roleAllowed(user, allowedRoles) {
  const role = normalizeRole(user?.role);
  return allowedRoles.map(normalizeRole).includes(role);
}

function apiForbidden(res, message = 'You do not have permission to access this resource.') {
  return res.status(403).json({ success: false, message });
}

function fallbackDemoAllowed() {
  const explicit = String(process.env.ALLOW_FALLBACK_DEMO_ACCOUNTS || '').toLowerCase();
  if (['1', 'true', 'yes'].includes(explicit)) return true;
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.NODE_ENV === 'production') return false;
  return true;
}

async function activeDatabaseAccount(claims) {
  const numericUserId = Number(claims?.userId);

  // Development-only legacy fallback accounts. Railway/production does not
  // accept them unless explicitly enabled.
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return fallbackDemoAllowed()
      ? { ok: true, fallback: true, user: claims }
      : { ok: false, status: 401, code: 'DATABASE_SESSION_REQUIRED', message: 'This session is not backed by an approved CafeKiosk account.' };
  }

  const sessionId = String(claims?.sid || '').trim();
  if (!sessionId) {
    return {
      ok: false,
      status: 401,
      code: 'LEGACY_SESSION_REJECTED',
      message: 'Your login session was created before the latest security upgrade. Please log in again.'
    };
  }

  try {
    const [rows] = await dbPool.execute(
      `SELECT
          u.user_id, u.cafe_id, u.username, u.email, u.full_name, u.role,
          u.is_owner, u.status AS user_status,
          c.cafe_name, c.status AS cafe_status,
          c.approval_status, c.rejection_reason,
          s.session_id, s.token_hash, s.expires_at, s.revoked_at
       FROM users u
       JOIN cafes c ON c.cafe_id = u.cafe_id
       JOIN user_sessions s ON s.user_id = u.user_id
       WHERE u.user_id = ?
         AND s.session_id = ?
       LIMIT 1`,
      [numericUserId, sessionId]
    );

    if (!rows.length) {
      return { ok: false, status: 401, code: 'SESSION_NOT_FOUND', message: 'This login session is no longer valid. Please log in again.' };
    }

    const row = rows[0];

    // Bind the database session to the exact signed JWT that was issued at login.
    // A copied/altered token, a token from a different server session, or a session
    // row with a missing token hash is rejected instead of being treated as valid.
    const presentedToken = String(claims?._rawToken || '');
    const storedTokenHash = String(row.token_hash || '');
    if (!presentedToken || !storedTokenHash || !safeEqualText(tokenDigest(presentedToken), storedTokenHash)) {
      return { ok: false, status: 401, code: 'SESSION_TOKEN_MISMATCH', message: 'This login session is no longer valid. Please log in again.' };
    }

    if (row.revoked_at) {
      return { ok: false, status: 401, code: 'SESSION_REVOKED', message: 'This login session has been revoked. Please log in again.' };
    }
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return { ok: false, status: 401, code: 'SESSION_EXPIRED', message: 'Your login session has expired. Please log in again.' };
    }

    const approval = String(row.approval_status || '').toLowerCase();
    if (approval === 'pending') {
      return { ok: false, status: 403, code: 'CAFE_APPROVAL_PENDING', message: `${row.cafe_name || 'This cafe'} is awaiting System Administrator approval.` };
    }
    if (approval === 'rejected') {
      return {
        ok: false,
        status: 403,
        code: 'CAFE_APPROVAL_REJECTED',
        message: row.rejection_reason ? `Cafe registration was not approved: ${row.rejection_reason}` : 'This cafe registration was not approved.'
      };
    }
    if (approval !== 'approved') {
      return { ok: false, status: 403, code: 'CAFE_NOT_APPROVED', message: 'This cafe is not approved for access.' };
    }
    if (String(row.cafe_status || '').toLowerCase() !== 'active') {
      return { ok: false, status: 403, code: 'CAFE_INACTIVE', message: 'This cafe account is inactive.' };
    }
    if (String(row.user_status || '').toLowerCase() !== 'active') {
      return { ok: false, status: 401, code: 'ACCOUNT_INACTIVE', message: 'Your CafeKiosk user account is not active.' };
    }

    // Current database values are authoritative. Claims are deliberately not
    // trusted for role, cafe, username, owner status, or display name.
    const user = {
      userId: Number(row.user_id),
      username: row.username,
      email: row.email || '',
      displayName: row.full_name || row.username,
      role: row.role,
      cafeId: row.cafe_id,
      cafeName: row.cafe_name || row.cafe_id,
      isOwner: Boolean(row.is_owner),
      sid: sessionId
    };

    // Touch at most once every five minutes to avoid a write on every request.
    dbPool.execute(
      `UPDATE user_sessions
          SET last_seen_at = NOW()
        WHERE session_id = ?
          AND last_seen_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [sessionId]
    ).catch(() => {});

    return { ok: true, row, user };
  } catch (error) {
    // Authentication is intentionally fail-closed. Missing approval/session
    // schema, DB outages, or query errors never grant access.
    console.error('Authentication database verification failed:', error.message);
    return {
      ok: false,
      status: 503,
      code: 'AUTH_DATABASE_UNAVAILABLE',
      message: 'Authentication service is temporarily unavailable.'
    };
  }
}

async function authenticateRequest(req, preferredRoles = []) {
  const claims = decodeRequestUser(req, preferredRoles);
  if (!claims) return { ok: false, status: 401, code: 'LOGIN_REQUIRED', message: 'Please log in first.' };
  const account = await activeDatabaseAccount(claims);
  if (!account.ok) return account;
  return { ok: true, user: account.user || claims, claims, account };
}

async function verifyToken(req, res, next) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return res.status(auth.status || 401).json({
      success: false,
      code: auth.code || 'AUTH_REQUIRED',
      message: auth.message || 'Authentication required.'
    });
  }
  req.user = auth.user;
  req.authClaims = auth.claims;
  return next();
}

const requireAuth = verifyToken;

async function optionalAuth(req, res, next) {
  const claims = decodeRequestUser(req) || null;
  if (!claims) {
    req.user = null;
    return next();
  }
  const account = await activeDatabaseAccount(claims);
  req.user = account.ok ? (account.user || claims) : null;
  req.authClaims = account.ok ? claims : null;
  return next();
}

function isAdmin(req, res, next) {
  return normalizeRole(req.user?.role) === 'admin' ? next() : apiForbidden(res, 'Admin access is required.');
}

function isStaff(req, res, next) {
  return normalizeRole(req.user?.role) === 'staff' ? next() : apiForbidden(res, 'Staff access is required.');
}

function isStaffOrAdmin(req, res, next) {
  return ['admin', 'manager', 'staff'].includes(normalizeRole(req.user?.role))
    ? next()
    : apiForbidden(res, 'Staff, Manager, or Admin access is required.');
}

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    const auth = await authenticateRequest(req, allowedRoles);
    if (!auth.ok) {
      return res.status(auth.status || 401).json({
        success: false,
        code: auth.code || 'AUTH_REQUIRED',
        message: auth.message || 'Authentication required.'
      });
    }
    req.user = auth.user;
    req.authClaims = auth.claims;
    if (!roleAllowed(auth.user, allowedRoles)) return apiForbidden(res);
    return next();
  };
}

function requirePageRole(...allowedRoles) {
  return async (req, res, next) => {
    const auth = await authenticateRequest(req, allowedRoles);
    const normalized = allowedRoles.map(normalizeRole);
    const target = normalized[0] === 'admin' ? '/admin-login'
      : normalized[0] === 'manager' ? '/manager-login'
        : normalized[0] === 'staff' ? '/staff-login' : '/login';

    if (!auth.ok) {
      return res.redirect(`${target}?auth=${encodeURIComponent(auth.message || 'Authentication required')}`);
    }

    if (!roleAllowed(auth.user, allowedRoles)) {
      return res.status(403).send(`
        <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Access Denied</title><style>body{font-family:Segoe UI,Arial,sans-serif;background:#f4ead9;color:#493321;margin:0;min-height:100vh;display:grid;place-items:center}.card{background:#fffaf1;padding:32px;border-radius:18px;max-width:460px;text-align:center;box-shadow:0 18px 45px rgba(81,56,36,.10)}a{display:inline-block;margin-top:16px;color:#5f9274;font-weight:700;text-decoration:none}</style></head>
        <body><div class="card"><h1>Access denied</h1><p>Your ${String(auth.user?.role || 'account')} account cannot open this page.</p><a href="${target}">Return to login</a></div></body></html>`);
    }

    req.user = auth.user;
    req.authClaims = auth.claims;
    return next();
  };
}

module.exports = {
  COOKIE_NAMES,
  parseCookies,
  getBearerToken,
  getRoleCookieToken,
  decodeRequestUser,
  authenticateRequest,
  verifyToken,
  requireAuth,
  optionalAuth,
  isAdmin,
  isStaff,
  isStaffOrAdmin,
  requireRole,
  requirePageRole,
  activeDatabaseAccount
};
