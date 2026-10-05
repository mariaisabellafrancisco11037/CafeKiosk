const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ensureApprovalPinSchema, getUserApprovalPinStatus, verifyUserApprovalPin, verifyCafeApprovalPin, ensureUserApprovalId } = require('../services/approvalPinService');
const pool = require('../config/dbPool');
const { addAuditLog } = require('../services/auditLogStore');
const kioskAccessStore = require('../services/kioskAccessStore');
const { sendStaffInvitation, sendPasswordResetEmail, sendCafeRegistrationNotification, sendOwnerVerificationEmail, sendRoleVerificationEmail, getEmailConfig } = require('../services/emailService');
const { buildPublicUrl } = require('../services/publicUrlService');
const { createSecurityAlert, clientIp } = require('../services/securityAlertService');
const { ensureSessionSchema, createSession, attachTokenHash, revokeSession, revokeAllUserSessions, SESSION_HOURS } = require('../services/authSessionService');

const { JWT_SECRET, isProduction } = require('../config/security');
const LOGIN_LOCK_THRESHOLD = Math.max(3, Number(process.env.LOGIN_LOCK_THRESHOLD || 5));
const LOGIN_WARNING_THRESHOLD = Math.min(LOGIN_LOCK_THRESHOLD - 1, Math.max(2, Number(process.env.LOGIN_WARNING_THRESHOLD || 3)));
const LOGIN_LOCK_MINUTES = Math.max(5, Number(process.env.LOGIN_LOCK_MINUTES || 15));

const socketTicketService = require('../services/socketTicketService');

const COOKIE_NAMES = {
  admin: 'cafe_admin_token',
  manager: 'cafe_manager_token',
  staff: 'cafe_staff_token'
};

function safeText(value) {
  return String(value ?? '').trim();
}

function normalizeRole(value) {
  const role = safeText(value).toLowerCase();
  if (role === 'admin' || role === 'owner') return 'Admin';
  if (role === 'staff') return 'Staff';
  if (role === 'manager') return 'Manager';
  return '';
}

function roleKey(value) {
  const role = normalizeRole(value);
  return role === 'Admin' ? 'admin' : role === 'Staff' ? 'staff' : role.toLowerCase();
}

function cookieNameForRole(value) {
  return COOKIE_NAMES[roleKey(value)] || null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
}

const EMAIL_VERIFICATION_EXPIRES_MINUTES = Math.max(10, Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES) || 30);

function verificationScopeForUser(user = {}) {
  if (Number(user.is_owner ?? 0) === 1 || user.isOwner === true) return 'Owner';
  const role = normalizeRole(user.role);
  return role || 'Staff';
}

function verificationRouteForScope(scope) {
  const normalized = safeText(scope).toLowerCase();
  if (normalized === 'owner') return '/api/auth/verify-owner-email';
  if (normalized === 'admin') return '/api/auth/verify-admin-email';
  if (normalized === 'manager') return '/api/auth/verify-manager-email';
  if (normalized === 'staff') return '/api/auth/verify-staff-email';
  return '/api/auth/verify-email';
}

function verificationLoginUrl(scope) {
  const normalized = safeText(scope).toLowerCase();
  if (normalized === 'owner' || normalized === 'admin') return '/admin-login';
  if (normalized === 'manager') return '/manager-login';
  if (normalized === 'staff') return '/staff-login';
  return '/login';
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderEmailVerificationPage(res, { ok, title, message, scope, statusCode, showLogin = true }) {
  const loginUrl = verificationLoginUrl(scope);
  const safeTitle = htmlEscape(title || (ok ? 'Email verified' : 'Verification failed'));
  const safeMessage = htmlEscape(message || '');
  const roleText = htmlEscape(scope || 'Account');
  const button = ok && showLogin
    ? `<a href="${loginUrl}" style="display:inline-block;margin-top:18px;background:#4f9872;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700">Continue to ${roleText} Login</a>`
    : '<a href="/login" style="display:inline-block;margin-top:18px;color:#356f55;font-weight:700">Back to CafeKiosk Login</a>';
  return res.status(statusCode || (ok ? 200 : 400)).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title></head><body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f1e8;color:#2f2a24;display:grid;place-items:center;min-height:100vh;padding:18px;box-sizing:border-box"><main style="width:min(560px,92vw);background:#fff;border:1px solid #e4dac8;border-radius:18px;padding:34px;text-align:center;box-shadow:0 12px 35px rgba(0,0,0,.08);box-sizing:border-box"><div style="width:60px;height:60px;border-radius:50%;margin:0 auto 16px;display:grid;place-items:center;background:${ok ? '#e9f5ee' : '#fdeceb'};font-size:28px">${ok ? '✓' : '!'}</div><h1 style="margin:0 0 12px;color:#234a3b">${safeTitle}</h1><p style="line-height:1.65;margin:0;color:#5f574e">${safeMessage}</p>${button}<p style="margin-top:28px;font-size:12px;color:#7a6e61">Powered by CafeKiosk</p></main></body></html>`);
}

async function issueEmailVerificationToken(connection, { userId, roleScope, purpose = 'account-verification', pendingEmail = null }) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000);

  // Only the newest unused token for the same user/purpose should remain valid.
  await connection.execute(
    `DELETE FROM email_verification_tokens WHERE user_id=? AND purpose=? AND verified_at IS NULL`,
    [userId, purpose]
  );
  await connection.execute(
    `INSERT INTO email_verification_tokens
       (user_id, token_hash, expires_at, verified_at, role_scope, purpose, pending_email)
     VALUES (?, ?, ?, NULL, ?, ?, ?)`,
    [userId, tokenHash, expiresAt, roleScope, purpose, pendingEmail || null]
  );
  return { token, tokenHash, expiresAt };
}

async function sendVerificationTokenEmail(req, user, tokenInfo, options = {}) {
  const scope = safeText(options.scope || verificationScopeForUser(user));
  const targetEmail = safeText(options.pendingEmail || user.email).toLowerCase();
  const route = verificationRouteForScope(scope);
  const verifyUrl = buildPublicUrl(req, `${route}?token=${encodeURIComponent(tokenInfo.token)}`);
  const sender = scope === 'Owner' ? sendOwnerVerificationEmail : sendRoleVerificationEmail;
  return sender({
    to: targetEmail,
    cafeName: safeText(user.cafe_name || user.cafeName) || 'CafeKiosk',
    ownerName: safeText(user.full_name || user.displayName || user.username),
    fullName: safeText(user.full_name || user.displayName || user.username),
    role: scope,
    verifyUrl,
    expiresMinutes: EMAIL_VERIFICATION_EXPIRES_MINUTES,
    pendingEmail: options.pendingEmail || null
  });
}


// -----------------------------------------------------------------------------
// AUTH / INVITATION DATABASE COMPATIBILITY
// -----------------------------------------------------------------------------
// Older CafeKiosk databases did not yet have cafe_id/email/is_owner or the
// invitation tables.  Instead of forcing the owner to delete/re-import the
// whole database, invitation-related endpoints upgrade only the missing auth
// fields/tables in place and preserve existing records.
async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?
      LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
      LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(connection, tableName, columnName, definition) {
  if (await columnExists(connection, tableName, columnName)) return;
  // table/column names and definitions are hard-coded by this module only.
  await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
}

async function ensureAuthSignupSchema(connection) {
  // The users table is required by every authentication path.  We do not
  // create a replacement if it is missing because that normally means the
  // base CafeKiosk schema has not been imported at all.
  if (!(await tableExists(connection, 'users'))) {
    const error = new Error('The users table is missing. Import CafeKiosk-DataBase/schema.sql first.');
    error.code = 'CAFEKIOSK_SCHEMA_MISSING';
    throw error;
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS cafes (
      cafe_id VARCHAR(50) PRIMARY KEY,
      cafe_name VARCHAR(150) NOT NULL,
      address VARCHAR(255) NULL,
      contact_number VARCHAR(50) NULL,
      email VARCHAR(190) NULL,
      opening_time TIME NULL,
      closing_time TIME NULL,
      timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Manila',
      status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  // Platform approval is separate from the cafe's normal Active/Inactive switch.
  // Existing cafes default to Approved; new public owner registrations are Pending.
  await addColumnIfMissing(connection, 'cafes', 'approval_status', "ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Approved'");
  await addColumnIfMissing(connection, 'cafes', 'approval_requested_at', 'DATETIME NULL');
  await addColumnIfMissing(connection, 'cafes', 'approved_at', 'DATETIME NULL');
  await addColumnIfMissing(connection, 'cafes', 'approved_by', 'VARCHAR(150) NULL');
  await addColumnIfMissing(connection, 'cafes', 'rejection_reason', 'VARCHAR(1000) NULL');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS cafe_approval_history (
      approval_history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cafe_id VARCHAR(50) NOT NULL,
      cafe_name_snapshot VARCHAR(150) NOT NULL,
      owner_name_snapshot VARCHAR(150) NULL,
      owner_email_snapshot VARCHAR(190) NULL,
      old_status VARCHAR(30) NOT NULL,
      new_status VARCHAR(30) NOT NULL,
      reason VARCHAR(1000) NULL,
      changed_by VARCHAR(150) NOT NULL,
      changed_from_ip VARCHAR(45) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_cafe_approval_history_cafe (cafe_id, created_at),
      KEY idx_cafe_approval_history_time (created_at)
    ) ENGINE=InnoDB
  `);

  // Columns required by the current login/profile/signup controllers.
  await addColumnIfMissing(connection, 'users', 'cafe_id', "VARCHAR(50) NOT NULL DEFAULT 'cafe-1'");
  await addColumnIfMissing(connection, 'users', 'email', 'VARCHAR(190) NULL');
  await addColumnIfMissing(connection, 'users', 'phone', 'VARCHAR(40) NULL');
  await addColumnIfMissing(connection, 'users', 'is_owner', 'TINYINT(1) NOT NULL DEFAULT 0');
  await addColumnIfMissing(connection, 'users', 'email_verified_at', 'DATETIME NULL');
  await addColumnIfMissing(connection, 'users', 'owner_verify_token_hash', 'CHAR(64) NULL');
  await addColumnIfMissing(connection, 'users', 'owner_verify_expires_at', 'DATETIME NULL');
  await addColumnIfMissing(connection, 'users', 'must_change_password', 'TINYINT(1) NOT NULL DEFAULT 0');
  await addColumnIfMissing(connection, 'users', 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumnIfMissing(connection, 'users', 'approval_pin_hash', 'VARCHAR(255) NULL');
  await addColumnIfMissing(connection, 'users', 'approval_pin_updated_at', 'DATETIME NULL');
  await addColumnIfMissing(connection, 'users', 'failed_attempts', 'INT UNSIGNED NOT NULL DEFAULT 0');
  await addColumnIfMissing(connection, 'users', 'lock_until', 'DATETIME NULL');

  // Older schemas only allowed Admin/Staff. Add Manager without touching rows.
  try {
    await connection.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('Admin','Staff','Manager') NOT NULL DEFAULT 'Staff'"
    );
  } catch (_) {
    // If a custom schema uses a compatible non-ENUM role column, leave it as-is.
  }

  const defaultCafeId = process.env.CAFE_ID || 'cafe-1';
  await connection.execute(
    `INSERT INTO cafes (cafe_id, cafe_name, timezone, status)
     VALUES (?, 'CafeKiosk', 'Asia/Manila', 'Active')
     ON DUPLICATE KEY UPDATE cafe_id = VALUES(cafe_id)`,
    [defaultCafeId]
  );

  await connection.query(`
    CREATE TABLE IF NOT EXISTS registration_invites (
      invite_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cafe_id VARCHAR(50) NOT NULL,
      invited_email VARCHAR(190) NOT NULL,
      invited_role ENUM('Admin','Staff','Manager') NOT NULL DEFAULT 'Staff',
      token_hash CHAR(64) NOT NULL,
      status ENUM('Pending','Accepted','Expired','Revoked') NOT NULL DEFAULT 'Pending',
      invited_by_user_id BIGINT UNSIGNED NOT NULL,
      accepted_by_user_id BIGINT UNSIGNED NULL,
      expires_at DATETIME NOT NULL,
      accepted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_registration_invite_token (token_hash),
      KEY idx_registration_invites_email (invited_email, status),
      KEY idx_registration_invites_cafe (cafe_id, status, expires_at)
    ) ENGINE=InnoDB
  `);

  await addColumnIfMissing(connection, 'registration_invites', 'email_sent_at', 'DATETIME NULL');
  await addColumnIfMissing(connection, 'registration_invites', 'email_delivery_status', "VARCHAR(30) NOT NULL DEFAULT 'NotSent'");
  await addColumnIfMissing(connection, 'registration_invites', 'email_delivery_error', 'VARCHAR(1000) NULL');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      verification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      verified_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_email_verification_token (token_hash),
      KEY idx_email_verification_user (user_id, expires_at)
    ) ENGINE=InnoDB
  `);
  // Role-scoped verification keeps one token usable only for the role/purpose
  // it was issued for. Existing installations are upgraded in-place.
  await addColumnIfMissing(connection, 'email_verification_tokens', 'role_scope', "VARCHAR(30) NOT NULL DEFAULT 'Admin'");
  await addColumnIfMissing(connection, 'email_verification_tokens', 'purpose', "VARCHAR(40) NOT NULL DEFAULT 'account-verification'");
  await addColumnIfMissing(connection, 'email_verification_tokens', 'pending_email', 'VARCHAR(190) NULL');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      reset_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_password_reset_token (token_hash),
      KEY idx_password_reset_user (user_id, expires_at)
    ) ENGINE=InnoDB
  `);

  // Server-side revocable sessions used by HttpOnly authentication cookies.
  await ensureSessionSchema(connection);
}

async function resolveDatabaseAdmin(req) {
  const cafeId = safeText(req.user?.cafeId) || process.env.CAFE_ID || 'cafe-1';
  const username = safeText(req.user?.username || process.env.ADMIN_USER_ID || 'admin');
  const displayName = safeText(req.user?.displayName || process.env.ADMIN_DISPLAY_NAME || 'CafeKiosk Administrator');

  const connection = await pool.getConnection();
  try {
    await ensureAuthSignupSchema(connection);

    const numericUserId = Number(req.user?.userId);
    if (Number.isFinite(numericUserId) && numericUserId > 0) {
      const [rows] = await connection.execute(
        `SELECT user_id, cafe_id, full_name, username, email, role, is_owner
           FROM users
          WHERE user_id = ? AND cafe_id = ?
          LIMIT 1`,
        [numericUserId, cafeId]
      );
      if (rows.length && normalizeRole(rows[0].role) === 'Admin') {
        return rows[0];
      }
    }

    // The session may come from the built-in demo Admin account. If an Admin
    // with the same username already exists in MySQL, bind the invitation to it.
    const [existing] = await connection.execute(
      `SELECT user_id, cafe_id, full_name, username, email, role, is_owner
         FROM users
        WHERE cafe_id = ? AND LOWER(username) = LOWER(?) AND role = 'Admin'
        LIMIT 1`,
      [cafeId, username]
    );
    if (existing.length) {
      await connection.execute(
        `UPDATE users
            SET is_owner = CASE WHEN LOWER(username)=LOWER(?) THEN 1 ELSE is_owner END
          WHERE user_id = ?`,
        [process.env.ADMIN_USER_ID || 'admin', existing[0].user_id]
      );
      return existing[0];
    }

    // No database Admin exists yet. Persist the authenticated built-in Admin
    // using the same configured password, so invitations and profile actions
    // immediately become database-backed without deleting existing data.
    if (normalizeRole(req.user?.role) !== 'Admin') return null;

    const fallbackPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(fallbackPassword, 10);
    const fallbackEmail = safeText(process.env.ADMIN_EMAIL) || `${username.replace(/[^a-z0-9._-]/gi, '') || 'admin'}@cafekiosk.local`;

    const [result] = await connection.execute(
      `INSERT INTO users
       (cafe_id, full_name, username, email, phone, password_hash, role, is_owner, status, email_verified_at)
       VALUES (?, ?, ?, ?, NULL, ?, 'Admin', 1, 'Active', NOW())`,
      [cafeId, displayName, username, fallbackEmail, passwordHash]
    );

    return {
      user_id: result.insertId,
      cafe_id: cafeId,
      username,
      role: 'Admin',
      is_owner: 1
    };
  } finally {
    connection.release();
  }
}

function makeCafeId(cafeName) {
  const base = safeText(cafeName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'cafe';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

function signToken(user, sessionId = '') {
  const numericUserId = Number(user?.userId);

  // Production/database sessions carry only the minimum stable identity needed
  // to locate the server-side session. Role/cafe/name are always reloaded from
  // MySQL on every protected request.
  if (Number.isFinite(numericUserId) && numericUserId > 0) {
    if (!sessionId) {
      const error = new Error('A server-side session ID is required for database users.');
      error.code = 'SERVER_SESSION_REQUIRED';
      throw error;
    }
    return jwt.sign({ userId: numericUserId, sid: sessionId, v: 2 }, JWT_SECRET, { expiresIn: `${SESSION_HOURS}h` });
  }

  // Development-only fallback account compatibility. Railway disables these by
  // default, so this payload is never accepted as production authentication.
  return jwt.sign({
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    cafeId: user.cafeId,
    cafeName: user.cafeName || '',
    isOwner: Boolean(user.isOwner),
    fallback: true
  }, JWT_SECRET, { expiresIn: `${SESSION_HOURS}h` });
}

async function issueLoginToken(user, req) {
  const numericUserId = Number(user?.userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return { token: signToken(user), sessionId: '' };
  }

  const session = await createSession(user, req);
  const token = signToken(user, session.sessionId);
  await attachTokenHash(session.sessionId, token);
  return { token, sessionId: session.sessionId, expiresAt: session.expiresAt };
}

function publicUser(user) {
  return {
    userId: user.userId,
    username: user.username,
    email: user.email || '',
    displayName: user.displayName,
    role: user.role,
    cafeId: user.cafeId,
    cafeName: user.cafeName || '',
    isOwner: Boolean(user.isOwner)
  };
}

function loginRedirect(role) {
  const key = roleKey(role);
  if (key === 'admin') return '/admin/dashboard';
  if (key === 'manager') return '/manager-dashboard';
  return '/staff-dashboard';
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction() || Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https'),
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
    path: '/',
    priority: 'high'
  };
}

function setRoleCookie(req, res, token, role) {
  const cookieName = cookieNameForRole(role);
  if (!cookieName) return;
  res.cookie(cookieName, token, cookieOptions(req));
}

function clearRoleCookie(req, res, role) {
  const cookieName = cookieNameForRole(role);
  if (!cookieName) return;
  const options = cookieOptions(req);
  delete options.maxAge;
  res.clearCookie(cookieName, options);
}

function allowFallbackDemoAccounts() {
  const explicit = String(process.env.ALLOW_FALLBACK_DEMO_ACCOUNTS || '').toLowerCase();
  if (['1', 'true', 'yes'].includes(explicit)) return true;
  // Never allow the hard-coded demo passwords on Railway/production unless
  // the deployer explicitly opts in. Local classroom/offline builds keep them.
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.NODE_ENV === 'production') return false;
  return true;
}

function getFallbackAccounts() {
  if (!allowFallbackDemoAccounts()) return [];
  return [
    {
      userId: process.env.ADMIN_USER_ID || 'admin',
      username: process.env.ADMIN_USER_ID || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      displayName: process.env.ADMIN_DISPLAY_NAME || 'CafeKiosk Administrator',
      role: 'Admin',
      cafeId: process.env.CAFE_ID || 'cafe-1',
      cafeName: process.env.CAFE_NAME || 'CafeKiosk Demo Cafe',
      isOwner: true
    },
    {
      userId: process.env.STAFF_USER_ID || 'staff',
      username: process.env.STAFF_USER_ID || 'staff',
      password: process.env.STAFF_PASSWORD || 'staff123',
      displayName: process.env.STAFF_DISPLAY_NAME || 'CafeKiosk Staff',
      role: 'Staff',
      cafeId: process.env.CAFE_ID || 'cafe-1',
      cafeName: process.env.CAFE_NAME || 'CafeKiosk Demo Cafe',
      isOwner: false
    }
  ];
}

function mapDbAccountRow(row) {
  if (!row) return null;
  const normalizedRole = normalizeRole(row.role) || safeText(row.role);
  return {
    userId: row.user_id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.full_name,
    role: normalizedRole,
    cafeId: row.cafe_id,
    cafeName: row.cafe_name || row.cafe_id || 'CafeKiosk',
    isOwner: Boolean(row.is_owner) || String(row.role || '').toLowerCase() === 'owner',
    status: row.status || 'Active',
    failedAttempts: Number(row.failed_attempts || 0),
    lockUntil: row.lock_until || null,
    cafeStatus: row.cafe_status || 'Active',
    approvalStatus: row.approval_status || 'Approved',
    rejectionReason: row.rejection_reason || ''
  };
}

async function findDbAccount(identifier, requestedCafeId, requestedRole, password = '') {
  const id = safeText(identifier).toLowerCase();
  if (!id) return null;

  const selectFields = `
    SELECT u.user_id, u.cafe_id, u.full_name, u.username, u.email,
           u.password_hash, u.role, u.is_owner, u.status,
           u.failed_attempts, u.lock_until,
           c.cafe_name, c.status AS cafe_status,
           COALESCE(c.approval_status, 'Approved') AS approval_status,
           c.rejection_reason
      FROM users u
      LEFT JOIN cafes c ON c.cafe_id = u.cafe_id`;

  // A login must work the same way on desktop, tablet and phone. Never require
  // browser-local cafeId to locate an account. Match either User ID or email,
  // then resolve the tenant using the submitted password.
  let roleFilter = '';
  const roleParams = [];
  if (requestedRole === 'Admin') {
    // Compatibility with older databases that stored cafe owners as "Owner".
    roleFilter = " AND LOWER(TRIM(u.role)) IN ('admin','owner')";
  } else if (requestedRole) {
    roleFilter = ' AND LOWER(TRIM(u.role))=LOWER(?)';
    roleParams.push(requestedRole);
  }

  const [rows] = await pool.execute(
    `${selectFields}
     WHERE (
       LOWER(TRIM(u.username))=?
       OR LOWER(TRIM(COALESCE(u.email,'')))=?
     )${roleFilter}
     ORDER BY u.user_id ASC
     LIMIT 50`,
    [id, id, ...roleParams]
  );

  if (!rows.length) return null;
  if (rows.length === 1) return mapDbAccountRow(rows[0]);

  const passwordMatches = [];
  for (const row of rows) {
    try {
      if (await bcrypt.compare(String(password || ''), row.password_hash || '')) {
        passwordMatches.push(row);
      }
    } catch (_) {}
  }

  if (passwordMatches.length === 1) return mapDbAccountRow(passwordMatches[0]);

  if (passwordMatches.length > 1) {
    // A remembered cafeId may be used only as a tie-breaker after the password
    // has already authenticated more than one otherwise-identical account.
    const requested = safeText(requestedCafeId);
    if (requested) {
      const sameCafe = passwordMatches.filter(row => String(row.cafe_id || '') === requested);
      if (sameCafe.length === 1) return mapDbAccountRow(sameCafe[0]);
    }

    const error = new Error('This User ID and password match more than one cafe. Please sign in using the account email address so CafeKiosk can identify the correct cafe.');
    error.statusCode = 409;
    throw error;
  }

  // Do not fall through to a demo account when a real database identity exists
  // but the password is wrong.
  const error = new Error('Invalid User ID/email or password.');
  error.statusCode = 401;
  throw error;
}

async function recordLoginAttempt(username, userId, status, req, cafeId) {
  try {
    await pool.execute(
      `INSERT INTO login_logs (cafe_id, user_id, username_attempted, ip_address, user_agent, login_status, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [cafeId || req.body?.cafeId || 'cafe-1', userId || null, username || null, req.ip || null, req.get?.('user-agent') || null, status]
    );
  } catch (_) {
    // Login itself should not fail only because logging is unavailable.
  }
}



// -----------------------------------------------------------------------------
// ADMIN USER MANAGEMENT
// -----------------------------------------------------------------------------

async function ensureAccountStatusHistory(connection) {
  await ensureAuthSignupSchema(connection);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS account_status_history (
      history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cafe_id VARCHAR(50) NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      old_status VARCHAR(30) NOT NULL,
      new_status VARCHAR(30) NOT NULL,
      reason VARCHAR(500) NOT NULL,
      changed_by_user_id BIGINT UNSIGNED NULL,
      changed_by_name VARCHAR(150) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_account_status_user (cafe_id, user_id, created_at),
      KEY idx_account_status_actor (changed_by_user_id, created_at)
    ) ENGINE=InnoDB
  `);
}

function auditUserStatusChange(req, target, oldStatus, newStatus, reason) {
  const actorName = safeText(req.user?.displayName || req.user?.username || 'Administrator');
  const action = newStatus === 'Inactive' ? 'Archive Employee' : 'Restore Employee';
  const verb = newStatus === 'Inactive' ? 'fired and archived' : 'restored';
  return addAuditLog({
    cafeId: req.user?.cafeId || target.cafe_id || 'cafe-1',
    user: actorName,
    userId: req.user?.userId || '',
    role: req.user?.role || 'Admin',
    action,
    category: 'Users',
    details: `${actorName} ${verb} ${target.role} account ${target.full_name} (${target.username}). Admin note: ${reason}`,
    entityId: String(target.user_id),
    source: 'Admin User Management',
    method: req.method || 'PATCH',
    path: req.path || '',
    ip: req.ip || '',
    statusCode: 200,
    success: true
  });
}

function emitForcedLogout(req, target) {
  const io = req.app?.get?.('io');
  if (!io || !target?.user_id) return;

  const role = String(target.role || '').toLowerCase();
  const clientRole = role === 'admin' ? 'admin' : role === 'manager' ? 'manager' : role === 'staff' ? 'staff' : '';
  const room = `user-${target.user_id}`;
  io.to(room).emit('auth:force-logout', {
    role: clientRole,
    reason: 'account-archived',
    message: 'Your CafeKiosk employment account was archived by the cafe administrator.'
  });

  // Give the browser enough time to process the logout event, then close any
  // remaining authenticated sockets belonging to this account.
  setTimeout(() => {
    try { io.in(room).disconnectSockets(true); } catch (_) {}
  }, 1200);
}

exports.listUsers = async (req, res) => {
  let cafeId = safeText(req.user?.cafeId) || 'cafe-1';
  let effectiveUserId = Number(req.user?.userId);
  let refreshedAuthToken = '';

  try {
    // Upgrade the built-in fallback Admin to a real database account before
    // rendering the User page. This prevents the fallback session from
    // bypassing account deactivation and gives self-protection a real user_id.
    if (!Number.isFinite(effectiveUserId) || effectiveUserId <= 0) {
      const admin = await resolveDatabaseAdmin(req);
      if (admin?.user_id) {
        effectiveUserId = Number(admin.user_id);
        cafeId = safeText(admin.cafe_id) || cafeId;
        const linked = {
          userId: effectiveUserId,
          username: admin.username || req.user?.username || 'admin',
          displayName: req.user?.displayName || process.env.ADMIN_DISPLAY_NAME || 'CafeKiosk Administrator',
          role: 'Admin',
          cafeId,
          isOwner: Boolean(admin.is_owner ?? true)
        };
        const issued = await issueLoginToken(linked, req);
        refreshedAuthToken = issued.token;
        setRoleCookie(req, res, refreshedAuthToken, 'Admin');
      }
    }

    const connection = await pool.getConnection();
    try {
      await ensureAccountStatusHistory(connection);
      const [rows] = await connection.execute(
        `SELECT u.user_id, u.full_name, u.username, u.email, u.phone, u.role, u.is_owner,
                u.status, u.last_login, u.created_at, u.updated_at,
                (SELECT h.reason
                   FROM account_status_history h
                  WHERE h.cafe_id=u.cafe_id AND h.user_id=u.user_id AND h.new_status='Inactive'
                  ORDER BY h.created_at DESC LIMIT 1) AS archive_reason,
                (SELECT h.changed_by_name
                   FROM account_status_history h
                  WHERE h.cafe_id=u.cafe_id AND h.user_id=u.user_id AND h.new_status='Inactive'
                  ORDER BY h.created_at DESC LIMIT 1) AS archived_by,
                (SELECT h.created_at
                   FROM account_status_history h
                  WHERE h.cafe_id=u.cafe_id AND h.user_id=u.user_id AND h.new_status='Inactive'
                  ORDER BY h.created_at DESC LIMIT 1) AS archived_at
           FROM users u
          WHERE u.cafe_id = ?
          ORDER BY u.is_owner DESC, FIELD(u.role,'Admin','Manager','Staff'), u.full_name ASC`,
        [cafeId]
      );
      return res.json({
        success: true,
        users: rows.map(row => ({
          id: String(row.user_id),
          userId: row.user_id,
          name: row.full_name,
          username: row.username,
          email: row.email || '',
          phone: row.phone || '',
          role: row.role,
          isOwner: Boolean(row.is_owner),
          status: row.status,
          lastLogin: row.last_login,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          archiveReason: row.archive_reason || '',
          archivedBy: row.archived_by || '',
          archivedAt: row.archived_at || null,
          isCurrentUser: Number(row.user_id) === Number(effectiveUserId)
        })),
        currentUserId: Number.isFinite(effectiveUserId) ? effectiveUserId : null
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load user accounts from the database.' });
  }
};


async function ensureDatabaseActor(req, res) {
  let numericUserId = Number(req.user?.userId);
  if (Number.isFinite(numericUserId) && numericUserId > 0) return numericUserId;
  const admin = await resolveDatabaseAdmin(req);
  if (!admin?.user_id) return null;
  numericUserId = Number(admin.user_id);
  req.user = {
    ...req.user,
    userId: numericUserId,
    cafeId: admin.cafe_id || req.user?.cafeId || 'cafe-1',
    role: 'Admin',
    isOwner: Boolean(admin.is_owner ?? true)
  };
  const linked = {
    userId: numericUserId,
    username: admin.username || req.user?.username || 'admin',
    displayName: req.user?.displayName || process.env.ADMIN_DISPLAY_NAME || 'CafeKiosk Administrator',
    role: 'Admin',
    cafeId: req.user.cafeId,
    isOwner: Boolean(req.user.isOwner)
  };
  const issued = await issueLoginToken(linked, req);
  const refreshed = issued.token;
  setRoleCookie(req, res, refreshed, 'Admin');
  res.locals.refreshedAuthToken = refreshed;
  return numericUserId;
}

exports.createUser = async (req, res) => {
  let actorId = null;
  try { actorId = await ensureDatabaseActor(req, res); } catch (error) { console.error('Resolve admin actor error:', error); }
  if (!actorId) return res.status(403).json({ success: false, message: 'A database-backed cafe Admin account is required to add employees.' });
  const cafeId = safeText(req.user?.cafeId) || 'cafe-1';
  const fullName = safeText(req.body?.name || req.body?.fullName);
  const username = safeText(req.body?.username || req.body?.userId);
  const email = safeText(req.body?.email).toLowerCase();
  const phone = safeText(req.body?.phone);
  const role = normalizeRole(req.body?.role) || 'Staff';
  const status = String(req.body?.status || 'Active') === 'Inactive' ? 'Inactive' : 'Active';
  const password = String(req.body?.password || '');

  if (!['Staff', 'Manager'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Direct employee creation supports Staff or Manager accounts only.' });
  }

  if (!fullName || !username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, User ID, email, and temporary password are required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Temporary password must be at least 8 characters.' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      await ensureAuthSignupSchema(connection);
      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await connection.execute(
        `INSERT INTO users
         (cafe_id, full_name, username, email, phone, password_hash, role, is_owner,
          status, email_verified_at, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), 1)`,
        [cafeId, fullName, username, email, phone || null, passwordHash, role, status]
      );

      addAuditLog({
        cafeId,
        user: req.user?.displayName || req.user?.username || 'Administrator',
        userId: req.user?.userId || '',
        role: req.user?.role || 'Admin',
        action: 'Create User',
        category: 'Users',
        details: `Created ${role} account ${fullName} (${username}) with status ${status}.`,
        entityId: String(result.insertId),
        source: 'Admin User Management',
        method: req.method,
        path: req.path,
        ip: req.ip || '',
        statusCode: 201,
        success: true
      });

      return res.status(201).json({ success: true, message: 'User account created.', userId: result.insertId });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create user error:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'That User ID or email address is already in use.' });
    }
    return res.status(500).json({ success: false, message: 'Unable to create the user account.' });
  }
};

exports.updateUser = async (req, res) => {
  try { await ensureDatabaseActor(req, res); } catch (_) {}
  const cafeId = safeText(req.user?.cafeId) || 'cafe-1';
  const targetId = Number(req.params?.userId);
  const fullName = safeText(req.body?.name || req.body?.fullName);
  const username = safeText(req.body?.username || req.body?.userId);
  const email = safeText(req.body?.email).toLowerCase();
  const phone = safeText(req.body?.phone);
  const role = normalizeRole(req.body?.role) || 'Staff';
  const password = String(req.body?.password || '');

  if (!Number.isFinite(targetId) || targetId <= 0 || !fullName || !username || !email) {
    return res.status(400).json({ success: false, message: 'Valid user, name, User ID, and email are required.' });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ success: false, message: 'New temporary password must be at least 8 characters.' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      await ensureAuthSignupSchema(connection);
      const [rows] = await connection.execute(
        `SELECT user_id, full_name, username, role, is_owner FROM users WHERE user_id=? AND cafe_id=? LIMIT 1`,
        [targetId, cafeId]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'User account was not found.' });

      const target = rows[0];
      if (Number(target.user_id) === Number(req.user?.userId) && role !== target.role) {
        return res.status(400).json({ success: false, message: 'You cannot change your own role from the User page.' });
      }
      if (target.is_owner && role !== 'Admin') {
        return res.status(400).json({ success: false, message: 'The cafe owner must keep the Admin role.' });
      }

      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await connection.execute(
          `UPDATE users SET full_name=?, username=?, email=?, phone=?, role=?, password_hash=?, must_change_password=1, updated_at=NOW()
            WHERE user_id=? AND cafe_id=?`,
          [fullName, username, email, phone || null, role, hash, targetId, cafeId]
        );
      } else {
        await connection.execute(
          `UPDATE users SET full_name=?, username=?, email=?, phone=?, role=?, updated_at=NOW()
            WHERE user_id=? AND cafe_id=?`,
          [fullName, username, email, phone || null, role, targetId, cafeId]
        );
      }


      if (role !== target.role || password) {
        await revokeAllUserSessions(targetId, connection);
        emitForcedLogout(req, { ...target, role: target.role });
      }

      addAuditLog({
        cafeId,
        user: req.user?.displayName || req.user?.username || 'Administrator',
        userId: req.user?.userId || '',
        role: req.user?.role || 'Admin',
        action: 'Edit User',
        category: 'Users',
        details: `Updated account ${fullName} (${username}). Role: ${role}.${password ? ' Temporary password was reset.' : ''}`,
        entityId: String(targetId),
        source: 'Admin User Management',
        method: req.method,
        path: req.path,
        ip: req.ip || '',
        statusCode: 200,
        success: true
      });
      return res.json({ success: true, message: 'User account updated.' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update user error:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'That User ID or email address is already in use.' });
    }
    return res.status(500).json({ success: false, message: 'Unable to update the user account.' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try { await ensureDatabaseActor(req, res); } catch (_) {}
  const cafeId = safeText(req.user?.cafeId) || 'cafe-1';
  const targetId = Number(req.params?.userId);
  const newStatus = String(req.body?.status || '').toLowerCase() === 'inactive' ? 'Inactive' :
                    String(req.body?.status || '').toLowerCase() === 'active' ? 'Active' : '';
  const reason = safeText(req.body?.reason);

  if (!Number.isFinite(targetId) || targetId <= 0 || !newStatus) {
    return res.status(400).json({ success: false, message: 'A valid user and account status are required.' });
  }
  if (reason.length < 3) {
    return res.status(400).json({ success: false, message: `Please write an admin note before ${newStatus === 'Inactive' ? 'deactivating' : 'activating'} this account.` });
  }
  if (targetId === Number(req.user?.userId) && newStatus === 'Inactive') {
    return res.status(400).json({ success: false, message: 'You cannot deactivate the account you are currently using.' });
  }

  try {
    await kioskAccessStore.ensureSchema();
  } catch (schemaError) {
    console.error('Kiosk access schema setup error:', schemaError);
    return res.status(500).json({ success: false, message: 'Unable to prepare kiosk access for this cafe account.' });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) {
    return res.status(503).json({ success: false, message: 'Database is unavailable. Start MySQL and try again.' });
  }

  try {
    await connection.beginTransaction();
    await ensureAccountStatusHistory(connection);

    const [rows] = await connection.execute(
      `SELECT user_id, cafe_id, full_name, username, role, is_owner, status
         FROM users
        WHERE user_id=? AND cafe_id=?
        FOR UPDATE`,
      [targetId, cafeId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'User account was not found.' });
    }

    const target = rows[0];
    const oldStatus = target.status;
    if (oldStatus === newStatus) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `This account is already ${newStatus.toLowerCase()}.` });
    }

    await connection.execute(
      `UPDATE users
          SET status=?, failed_attempts=0, lock_until=NULL, updated_at=NOW()
        WHERE user_id=? AND cafe_id=?`,
      [newStatus, targetId, cafeId]
    );

    await connection.execute(
      `INSERT INTO account_status_history
       (cafe_id, user_id, old_status, new_status, reason, changed_by_user_id, changed_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cafeId,
        targetId,
        oldStatus,
        newStatus,
        reason,
        Number.isFinite(Number(req.user?.userId)) ? Number(req.user.userId) : null,
        safeText(req.user?.displayName || req.user?.username || 'Administrator')
      ]
    );

    // Revoke any database session records if this installation uses them.
    try {
      if (await tableExists(connection, 'user_sessions')) {
        await connection.execute('DELETE FROM user_sessions WHERE user_id=?', [targetId]);
      }
    } catch (_) {}

    await connection.commit();

    try {
      auditUserStatusChange(req, target, oldStatus, newStatus, reason);
    } catch (auditError) {
      console.error('Account status audit write failed:', auditError);
    }

    if (newStatus === 'Inactive') {
      emitForcedLogout(req, target);
    }

    return res.json({
      success: true,
      message: newStatus === 'Inactive'
        ? `${target.full_name} was fired and moved to Former Employee Archives.`
        : `${target.full_name} was restored to the active employee list.`,
      user: { id: String(target.user_id), status: newStatus },
      kickedOut: newStatus === 'Inactive'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Update user status error:', error);
    return res.status(500).json({ success: false, message: 'Unable to change the account status.' });
  } finally {
    connection.release();
  }
};

exports.login = async (req, res) => {
  const username = safeText(req.body?.username || req.body?.userId);
  const password = String(req.body?.password || '');
  const requestedRole = normalizeRole(req.body?.role);
  // A browser/device cafeId is never trusted for login tenant selection.
  // It may be absent on a fresh tablet and stale on a shared device.
  const requestedCafeId = safeText(req.body?.cafeId);

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'User ID/email and password are required.' });
  }

  let account = null;
  let dbAvailable = true;

  try {
    account = await findDbAccount(username, requestedCafeId, requestedRole, password);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.warn('Database login unavailable; trying local demo accounts:', error.message);
    dbAvailable = false;
  }

  if (account) {
    const lockUntil = account.lockUntil ? new Date(account.lockUntil) : null;
    if (lockUntil && Number.isFinite(lockUntil.getTime()) && lockUntil.getTime() > Date.now()) {
      await recordLoginAttempt(username, account.userId, 'Locked', req, account.cafeId);
      const minutes = Math.max(1, Math.ceil((lockUntil.getTime() - Date.now()) / 60000));
      return res.status(429).json({
        success: false,
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
        message: `Too many failed sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}, or use Forgot Password.`
      });
    }
    if (lockUntil && Number.isFinite(lockUntil.getTime()) && lockUntil.getTime() <= Date.now()) {
      account.failedAttempts = 0;
      account.lockUntil = null;
      try {
        await pool.execute('UPDATE users SET failed_attempts=0, lock_until=NULL WHERE user_id=?', [account.userId]);
      } catch (_) {}
    }

    const passwordOK = await bcrypt.compare(password, account.passwordHash || '');
    if (!passwordOK) {
      const nextAttempts = Number(account.failedAttempts || 0) + 1;
      const shouldLock = nextAttempts >= LOGIN_LOCK_THRESHOLD;
      const sourceIp = clientIp(req);
      try {
        if (shouldLock) {
          const lockUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
          await pool.execute(
            'UPDATE users SET failed_attempts=?, lock_until=? WHERE user_id=?',
            [nextAttempts, lockUntil, account.userId]
          );
          await recordLoginAttempt(username, account.userId, 'Locked', req, account.cafeId);
          await createSecurityAlert({
            cafeId: account.cafeId,
            alertType: 'ACCOUNT_BRUTE_FORCE_LOCK',
            severity: 'high',
            sourceIp,
            dedupeMinutes: LOGIN_LOCK_MINUTES,
            message: `Brute-force protection temporarily locked a cafe account after ${nextAttempts} failed sign-in attempts. Lock duration: ${LOGIN_LOCK_MINUTES} minutes.`
          });
        } else {
          await pool.execute('UPDATE users SET failed_attempts=? WHERE user_id=?', [nextAttempts, account.userId]);
          await recordLoginAttempt(username, account.userId, 'Failed', req, account.cafeId);
          if (nextAttempts === LOGIN_WARNING_THRESHOLD) {
            await createSecurityAlert({
              cafeId: account.cafeId,
              alertType: 'REPEATED_LOGIN_FAILURES',
              severity: 'medium',
              sourceIp,
              dedupeMinutes: 10,
              message: `Repeated failed sign-in attempts detected. ${nextAttempts} consecutive failures have been recorded; the account will be temporarily locked if attempts continue.`
            });
          }
        }
      } catch (_) {}

      if (shouldLock) {
        return res.status(429).json({
          success: false,
          code: 'ACCOUNT_TEMPORARILY_LOCKED',
          message: `Too many failed sign-in attempts. This account is temporarily locked for ${LOGIN_LOCK_MINUTES} minutes. You can also use Forgot Password.`
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid User ID/email or password.' });
    }

    if (String(account.approvalStatus || 'Approved').toLowerCase() === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'CAFE_APPROVAL_PENDING',
        message: `${account.cafeName || 'This cafe'} is awaiting System Administrator approval. You can sign in after the registration is approved.`
      });
    }
    if (String(account.approvalStatus || 'Approved').toLowerCase() === 'rejected') {
      return res.status(403).json({
        success: false,
        code: 'CAFE_APPROVAL_REJECTED',
        message: account.rejectionReason
          ? `Cafe registration was not approved: ${account.rejectionReason}`
          : 'This cafe registration was not approved. Please contact the System Administrator.'
      });
    }
    if (String(account.cafeStatus || 'Active').toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'This cafe account is inactive. Please contact the System Administrator.' });
    }
    if (account.status !== 'Active') {
      return res.status(403).json({ success: false, message: `This account is ${String(account.status).toLowerCase()}. Please contact the cafe owner.` });
    }

    if (requestedRole && requestedRole !== account.role) {
      return res.status(403).json({ success: false, message: `This account is not authorized for ${requestedRole} login.` });
    }

    try {
      await pool.execute('UPDATE users SET last_login=NOW(), failed_attempts=0, lock_until=NULL WHERE user_id=?', [account.userId]);
      await recordLoginAttempt(username, account.userId, 'Success', req, account.cafeId);
    } catch (_) {}
  } else {
    const wanted = username.toLowerCase();
    const fallback = getFallbackAccounts().find(x =>
      x.username.toLowerCase() === wanted && (!requestedRole || x.role === requestedRole)
    );

    if (!fallback || fallback.password !== password) {
      return res.status(401).json({
        success: false,
        message: dbAvailable
          ? 'Invalid User ID/email or password.'
          : 'Invalid login. If you are using a newly registered account, import CafeKiosk-DataBase/schema.sql and check MySQL.'
      });
    }
    account = fallback;
  }

  let issued;
  try {
    issued = await issueLoginToken(account, req);
  } catch (error) {
    console.error('Create secure login session error:', error);
    return res.status(503).json({ success: false, message: 'Unable to create a secure login session right now.' });
  }

  setRoleCookie(req, res, issued.token, account.role);

  return res.json({
    success: true,
    message: 'Login successful.',
    sessionRole: account.role,
    user: publicUser(account),
    redirect: loginRedirect(account.role)
  });
};


const PASSWORD_RESET_EXPIRES_MINUTES = Math.max(10, Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES) || 30);

function validRecoveryRole(value) {
  const role = normalizeRole(value);
  return ['Admin', 'Manager', 'Staff'].includes(role) ? role : '';
}

function passwordResetLoginUrl(role) {
  const normalized = normalizeRole(role);
  if (normalized === 'Admin') return '/admin-login';
  if (normalized === 'Manager') return '/manager-login';
  return '/staff-login';
}

function validateRecoveryPassword(value) {
  const password = String(value || '');
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return '';
}

exports.requestPasswordReset = async (req, res) => {
  const email = safeText(req.body?.email).toLowerCase();
  const requestedRole = validRecoveryRole(req.body?.role);
  const genericMessage = 'If an eligible CafeKiosk account matches that email, a secure password-reset link will be sent. Please check your inbox and spam folder.';

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid registered email address.' });
  }

  const emailConfig = getEmailConfig();
  if (!emailConfig.configured) {
    return res.status(503).json({
      success: false,
      code: 'PASSWORD_EMAIL_NOT_CONFIGURED',
      message: 'Password recovery email is not configured yet. Please contact the CafeKiosk administrator.'
    });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) return res.status(503).json({ success: false, message: 'Password recovery is temporarily unavailable.' });

  try {
    await ensureAuthSignupSchema(connection);
    const params = requestedRole ? [email, requestedRole] : [email];
    const [rows] = await connection.execute(
      `SELECT u.user_id, u.cafe_id, u.full_name, u.email, u.role, u.status,
              c.cafe_name, c.status AS cafe_status, COALESCE(c.approval_status, 'Approved') AS approval_status
         FROM users u
         JOIN cafes c ON c.cafe_id=u.cafe_id
        WHERE LOWER(u.email)=?${requestedRole ? ' AND u.role=?' : ''}
        LIMIT 1`,
      params
    );

    if (!rows.length || String(rows[0].status || '').toLowerCase() === 'inactive') {
      return res.json({ success: true, message: genericMessage });
    }

    const user = rows[0];
    const [recent] = await connection.execute(
      `SELECT reset_id
         FROM password_reset_tokens
        WHERE user_id=? AND used_at IS NULL AND created_at > (NOW() - INTERVAL 60 SECOND)
        ORDER BY reset_id DESC LIMIT 1`,
      [user.user_id]
    );
    if (recent.length) {
      return res.json({ success: true, message: genericMessage, throttled: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE password_reset_tokens
          SET used_at=COALESCE(used_at, NOW())
        WHERE user_id=? AND used_at IS NULL`,
      [user.user_id]
    );
    const [inserted] = await connection.execute(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at, created_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NULL, NOW())`,
      [user.user_id, tokenHash, PASSWORD_RESET_EXPIRES_MINUTES]
    );
    await connection.commit();

    const resetUrl = buildPublicUrl(req, `/reset-password?token=${encodeURIComponent(token)}`);
    const delivery = await sendPasswordResetEmail({
      to: user.email,
      cafeName: user.cafe_name,
      fullName: user.full_name,
      role: user.role,
      resetUrl,
      expiresMinutes: PASSWORD_RESET_EXPIRES_MINUTES
    });

    if (!delivery.sent) {
      try {
        await connection.execute('UPDATE password_reset_tokens SET used_at=NOW() WHERE reset_id=?', [inserted.insertId]);
      } catch (_) {}
      console.error('Password reset email delivery failed:', delivery.error || 'Unknown Resend error');
    } else {
      try {
        addAuditLog({
          cafeId: user.cafe_id,
          user: user.full_name || user.email,
          userId: String(user.user_id),
          role: user.role,
          action: 'Password Reset Requested',
          category: 'Authentication',
          details: 'A secure password reset link was issued to the registered email address.',
          entityId: String(user.user_id),
          source: 'Forgot Password',
          method: req.method,
          path: req.path,
          ip: req.ip || '',
          statusCode: 200,
          success: true
        });
      } catch (_) {}
    }

    return res.json({ success: true, message: genericMessage });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Forgot password request error:', error);
    return res.status(500).json({ success: false, message: 'Password recovery is temporarily unavailable. Please try again.' });
  } finally {
    connection.release();
  }
};

exports.validatePasswordReset = async (req, res) => {
  const token = safeText(req.query?.token);
  if (!token || token.length < 32) {
    return res.status(400).json({ success: false, valid: false, message: 'This password-reset link is invalid.' });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) return res.status(503).json({ success: false, valid: false, message: 'Password recovery is temporarily unavailable.' });

  try {
    await ensureAuthSignupSchema(connection);
    const [rows] = await connection.execute(
      `SELECT pr.reset_id, pr.expires_at,
              u.user_id, u.full_name, u.email, u.role, u.status,
              c.cafe_name
         FROM password_reset_tokens pr
         JOIN users u ON u.user_id=pr.user_id
         JOIN cafes c ON c.cafe_id=u.cafe_id
        WHERE pr.token_hash=?
          AND pr.used_at IS NULL
          AND pr.expires_at>NOW()
          AND u.status<>'Inactive'
        LIMIT 1`,
      [sha256(token)]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, valid: false, message: 'This password-reset link is invalid, expired, or has already been used.' });
    }

    const row = rows[0];
    return res.json({
      success: true,
      valid: true,
      account: {
        fullName: row.full_name,
        role: row.role,
        cafeName: row.cafe_name,
        emailHint: String(row.email || '').replace(/^(.{1,2}).*(@.*)$/, '$1••••$2')
      }
    });
  } catch (error) {
    console.error('Validate password reset error:', error);
    return res.status(500).json({ success: false, valid: false, message: 'Unable to validate this password-reset link.' });
  } finally {
    connection.release();
  }
};

exports.resetPassword = async (req, res) => {
  const token = safeText(req.body?.token);
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  const passwordError = validateRecoveryPassword(newPassword);

  if (!token) return res.status(400).json({ success: false, message: 'Password-reset token is required.' });
  if (passwordError) return res.status(400).json({ success: false, message: passwordError });
  if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'The password confirmation does not match.' });

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) return res.status(503).json({ success: false, message: 'Password recovery is temporarily unavailable.' });

  try {
    await ensureAuthSignupSchema(connection);
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT pr.reset_id, pr.user_id,
              u.cafe_id, u.full_name, u.email, u.role, u.status, u.password_hash
         FROM password_reset_tokens pr
         JOIN users u ON u.user_id=pr.user_id
        WHERE pr.token_hash=?
          AND pr.used_at IS NULL
          AND pr.expires_at>NOW()
        LIMIT 1 FOR UPDATE`,
      [sha256(token)]
    );

    if (!rows.length || String(rows[0].status || '').toLowerCase() === 'inactive') {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'This password-reset link is invalid, expired, or has already been used.' });
    }

    const user = rows[0];
    const samePassword = await bcrypt.compare(newPassword, user.password_hash || '');
    if (samePassword) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Choose a new password that is different from your current password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await connection.execute(
      `UPDATE users
          SET password_hash=?, failed_attempts=0, lock_until=NULL, must_change_password=0, updated_at=NOW()
        WHERE user_id=?`,
      [passwordHash, user.user_id]
    );
    await connection.execute(
      `UPDATE password_reset_tokens
          SET used_at=NOW()
        WHERE user_id=? AND used_at IS NULL`,
      [user.user_id]
    );

    if (await tableExists(connection, 'user_sessions')) {
      await connection.execute('DELETE FROM user_sessions WHERE user_id=?', [user.user_id]);
    }

    await connection.commit();

    try {
      addAuditLog({
        cafeId: user.cafe_id,
        user: user.full_name || user.email,
        userId: String(user.user_id),
        role: user.role,
        action: 'Password Reset Completed',
        category: 'Authentication',
        details: 'Password was changed through the verified registered-email recovery flow.',
        entityId: String(user.user_id),
        source: 'Forgot Password',
        method: req.method,
        path: req.path,
        ip: req.ip || '',
        statusCode: 200,
        success: true
      });
    } catch (_) {}

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. You can now sign in with your new password.',
      loginUrl: passwordResetLoginUrl(user.role)
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to reset the password right now.' });
  } finally {
    connection.release();
  }
};

exports.ownerSignup = async (req, res) => {
  const cafeName = safeText(req.body?.cafeName);
  const fullName = safeText(req.body?.fullName);
  const email = safeText(req.body?.email).toLowerCase();
  const phone = safeText(req.body?.phone);
  const username = safeText(req.body?.username);
  const password = String(req.body?.password || '');

  if (!cafeName || !fullName || !email || !phone || !username || !password) {
    return res.status(400).json({ success: false, message: 'Cafe name, owner name, email, phone number, username, and password are required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) {
    return res.status(503).json({ success: false, message: 'Database is not available. Import CafeKiosk-DataBase/schema.sql and start MySQL first.' });
  }

  try {
    await ensureAuthSignupSchema(connection);
    await connection.beginTransaction();

    const [emailRows] = await connection.execute('SELECT user_id FROM users WHERE LOWER(email)=? LIMIT 1', [email]);
    if (emailRows.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'That email address already has an account.' });
    }

    let cafeId;
    for (let i = 0; i < 5; i += 1) {
      const candidate = makeCafeId(cafeName);
      const [rows] = await connection.execute('SELECT cafe_id FROM cafes WHERE cafe_id=? LIMIT 1', [candidate]);
      if (!rows.length) { cafeId = candidate; break; }
    }
    if (!cafeId) throw new Error('Could not generate a unique Cafe ID.');

    const passwordHash = await bcrypt.hash(password, 10);
    await connection.execute(
      `INSERT INTO cafes
       (cafe_id, cafe_name, email, timezone, status, approval_status, approval_requested_at, approved_at, approved_by, rejection_reason)
       VALUES (?, ?, ?, 'Asia/Manila', 'Inactive', 'Pending', NOW(), NULL, NULL, NULL)`,
      [cafeId, cafeName, email]
    );

    // Every cafe gets its own permanent kiosk address. The owner may customize
    // this friendly slug immediately after signup or later in Admin Settings.
    const kioskSlug = await kioskAccessStore.createUniqueSlug(cafeId, cafeName, connection);

    const [userResult] = await connection.execute(
      `INSERT INTO users
       (cafe_id, full_name, username, email, phone, password_hash, role, is_owner, status, email_verified_at, owner_verify_token_hash, owner_verify_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Admin', 1, 'Pending', NULL, NULL, NULL)`,
      [cafeId, fullName, username, email, phone || null, passwordHash]
    );

    const verificationToken = await issueEmailVerificationToken(connection, {
      userId: userResult.insertId,
      roleScope: 'Owner',
      purpose: 'owner-signup'
    });
    // Keep the legacy owner token columns synchronized so verification links
    // already sent by older CafeKiosk builds remain compatible with this build.
    await connection.execute(
      `UPDATE users SET owner_verify_token_hash=?, owner_verify_expires_at=? WHERE user_id=?`,
      [verificationToken.tokenHash, verificationToken.expiresAt, userResult.insertId]
    );

    // A newly registered cafe intentionally starts with an empty catalog.
    // The CafeKiosk Demo Cafe (cafe-1) keeps its seeded demo categories/items,
    // but real cafe owners create categories and products that match their own menu.

    await connection.execute('INSERT INTO store_settings (cafe_id, store_name, email) VALUES (?, ?, ?)', [cafeId, cafeName, email]);
    await connection.execute('INSERT INTO tax_settings (cafe_id, tax_rate_percent, service_charge_percent) VALUES (?, 0, 0)', [cafeId]);
    await connection.execute(
      `INSERT INTO system_preferences (cafe_id, default_order_type, low_stock_warning_default, currency_code, currency_symbol)
       VALUES (?, 'Dine In', 10, 'PHP', '₱')`,
      [cafeId]
    );
    const methods = [['Cash', 'Cash', 1, 1], ['GCash', 'GCash / E-wallet', 0, 2], ['Card', 'Card', 0, 3], ['Other', 'Other', 0, 4]];
    for (const method of methods) {
      await connection.execute(
        `INSERT INTO payment_methods (cafe_id, method_name, display_name, is_enabled, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [cafeId, ...method]
      );
    }

    await connection.commit();

    const verificationEmail = await sendVerificationTokenEmail(req, {
      user_id: userResult.insertId,
      cafe_id: cafeId,
      cafe_name: cafeName,
      full_name: fullName,
      username,
      email,
      role: 'Admin',
      is_owner: 1
    }, verificationToken, { scope: 'Owner' }).catch(error => ({
      sent: false,
      configured: true,
      error: error?.message || 'Verification email failed.'
    }));

    // System Administrator approval and owner email verification are separate
    // requirements. Sending this notification never auto-approves the cafe.
    const systemAdminNotification = await sendCafeRegistrationNotification({
      cafeName,
      cafeId,
      ownerName: fullName,
      ownerEmail: email,
      ownerPhone: phone
    }).catch(error => ({ sent: false, error: error?.message || 'System Administrator notification failed.' }));

    return res.status(201).json({
      success: true,
      pendingApproval: true,
      emailVerificationRequired: true,
      verificationEmailSent: Boolean(verificationEmail?.sent),
      systemAdminNotificationSent: Boolean(systemAdminNotification?.sent),
      message: verificationEmail?.sent
        ? 'Registration submitted. Verify the owner email using the secure link, then wait for System Administrator approval.'
        : 'Registration submitted, but the owner verification email could not be delivered. Use Resend Verification or contact the System Administrator.',
      emailError: verificationEmail?.sent ? undefined : verificationEmail?.error,
      cafeId,
      userId: userResult.insertId,
      kioskSlug,
      kioskUrl: kioskAccessStore.buildKioskUrl(kioskSlug),
      kioskEnabled: false,
      loginUrl: '/admin-login'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Owner signup error:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'The username or email is already in use.' });
    }
    return res.status(500).json({ success: false, message: 'Unable to create the cafe account.' });
  } finally {
    connection.release();
  }
};


exports.verifyEmail = async (req, res) => {
  const token = safeText(req.query?.token);
  const expectedScope = safeText(req.emailVerificationScope || '');
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return renderEmailVerificationPage(res, {
      ok: false,
      title: 'Invalid verification link',
      message: 'This CafeKiosk email-verification link is incomplete or invalid.',
      scope: expectedScope || 'Account',
      statusCode: 400
    });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) {
    return renderEmailVerificationPage(res, {
      ok: false,
      title: 'Verification unavailable',
      message: 'CafeKiosk could not connect to the database. Please try the link again shortly.',
      scope: expectedScope || 'Account',
      statusCode: 503
    });
  }

  let transactionOpen = false;
  try {
    await ensureAuthSignupSchema(connection);
    await connection.beginTransaction();
    transactionOpen = true;
    const tokenHash = sha256(token);

    const [rows] = await connection.execute(
      `SELECT v.verification_id, v.user_id, v.expires_at, v.verified_at,
              v.role_scope, v.purpose, v.pending_email,
              u.cafe_id, u.full_name, u.username, u.email, u.role, u.is_owner,
              u.status AS user_status, u.email_verified_at,
              c.cafe_name, c.approval_status, c.status AS cafe_status
         FROM email_verification_tokens v
         JOIN users u ON u.user_id=v.user_id
         LEFT JOIN cafes c ON c.cafe_id=u.cafe_id
        WHERE v.token_hash=?
        LIMIT 1
        FOR UPDATE`,
      [tokenHash]
    );

    let row = rows[0] || null;
    let legacyOwnerToken = false;

    // Backward compatibility: older CafeKiosk versions stored the owner token
    // directly on users.owner_verify_token_hash. This makes links already sent
    // before this fix usable instead of producing a 404/invalid result.
    if (!row && (!expectedScope || expectedScope.toLowerCase() === 'owner')) {
      const [legacyRows] = await connection.execute(
        `SELECT NULL AS verification_id, u.user_id, u.owner_verify_expires_at AS expires_at,
                NULL AS verified_at, 'Owner' AS role_scope, 'owner-signup' AS purpose,
                NULL AS pending_email, u.cafe_id, u.full_name, u.username, u.email,
                u.role, u.is_owner, u.status AS user_status, u.email_verified_at,
                c.cafe_name, c.approval_status, c.status AS cafe_status
           FROM users u
           LEFT JOIN cafes c ON c.cafe_id=u.cafe_id
          WHERE u.is_owner=1 AND u.owner_verify_token_hash=?
          LIMIT 1
          FOR UPDATE`,
        [tokenHash]
      );
      row = legacyRows[0] || null;
      legacyOwnerToken = Boolean(row);
    }

    if (!row) {
      await connection.rollback();
      transactionOpen = false;
      return renderEmailVerificationPage(res, {
        ok: false,
        title: 'Verification link not found',
        message: 'This verification link is invalid, expired, or has already been replaced by a newer link.',
        scope: expectedScope || 'Account',
        statusCode: 404
      });
    }

    const actualScope = verificationScopeForUser({ role: row.role, is_owner: row.is_owner });
    const tokenScope = safeText(row.role_scope || actualScope);
    const scopeMatches = !expectedScope || expectedScope.toLowerCase() === actualScope.toLowerCase();
    const tokenMatchesRole = tokenScope.toLowerCase() === actualScope.toLowerCase();
    if (!scopeMatches || !tokenMatchesRole) {
      await connection.rollback();
      transactionOpen = false;
      return renderEmailVerificationPage(res, {
        ok: false,
        title: 'Role verification mismatch',
        message: `This secure link was not issued for the ${expectedScope || actualScope} role.`,
        scope: expectedScope || actualScope,
        statusCode: 403
      });
    }

    if (row.verified_at) {
      await connection.rollback();
      transactionOpen = false;
      return renderEmailVerificationPage(res, {
        ok: false,
        title: 'Link already used',
        message: 'This email-verification link has already been used. Sign in normally or request a new verification link if needed.',
        scope: actualScope,
        statusCode: 410
      });
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      await connection.rollback();
      transactionOpen = false;
      return renderEmailVerificationPage(res, {
        ok: false,
        title: 'Verification link expired',
        message: 'This secure verification link has expired. Request a new verification email and use the newest link.',
        scope: actualScope,
        statusCode: 410
      });
    }

    const pendingEmail = safeText(row.pending_email).toLowerCase();
    const isEmailChange = safeText(row.purpose).toLowerCase() === 'email-change' && Boolean(pendingEmail);

    if (isEmailChange) {
      const [duplicates] = await connection.execute(
        `SELECT user_id FROM users WHERE LOWER(email)=LOWER(?) AND user_id<>? LIMIT 1 FOR UPDATE`,
        [pendingEmail, row.user_id]
      );
      if (duplicates.length) {
        await connection.rollback();
        transactionOpen = false;
        return renderEmailVerificationPage(res, {
          ok: false,
          title: 'Email already in use',
          message: 'That email address is already linked to another CafeKiosk account. Your current login email was not changed.',
          scope: actualScope,
          statusCode: 409
        });
      }

      await connection.execute(
        `UPDATE users SET email=?, email_verified_at=NOW(), updated_at=NOW() WHERE user_id=?`,
        [pendingEmail, row.user_id]
      );
      if (actualScope === 'Owner') {
        try { await connection.execute(`UPDATE cafes SET email=?, updated_at=NOW() WHERE cafe_id=?`, [pendingEmail, row.cafe_id]); } catch (_) {}
        try { await connection.execute(`UPDATE store_settings SET email=? WHERE cafe_id=?`, [pendingEmail, row.cafe_id]); } catch (_) {}
      }
      try {
        await connection.execute('DELETE FROM password_reset_tokens WHERE user_id=?', [row.user_id]);
      } catch (_) {}
      try {
        await revokeAllUserSessions(row.user_id, connection);
      } catch (_) {}
    } else {
      const approvedCafe = String(row.approval_status || 'Approved').toLowerCase() === 'approved' &&
        String(row.cafe_status || 'Active').toLowerCase() === 'active';
      if (actualScope === 'Owner') {
        await connection.execute(
          `UPDATE users
              SET email_verified_at=NOW(),
                  status=CASE WHEN ? THEN 'Active' ELSE status END,
                  owner_verify_token_hash=NULL,
                  owner_verify_expires_at=NULL,
                  updated_at=NOW()
            WHERE user_id=?`,
          [approvedCafe ? 1 : 0, row.user_id]
        );
      } else {
        await connection.execute(
          `UPDATE users SET email_verified_at=NOW(), updated_at=NOW() WHERE user_id=?`,
          [row.user_id]
        );
      }
    }

    if (!legacyOwnerToken && row.verification_id) {
      await connection.execute(
        `UPDATE email_verification_tokens SET verified_at=NOW() WHERE verification_id=?`,
        [row.verification_id]
      );
    }
    // Invalidate every other outstanding verification for the same account and
    // purpose; a one-time token must not remain reusable after success.
    await connection.execute(
      `DELETE FROM email_verification_tokens
        WHERE user_id=? AND purpose=? AND verified_at IS NULL`,
      [row.user_id, row.purpose || 'account-verification']
    );

    await connection.commit();
    transactionOpen = false;

    const approvalPending = actualScope === 'Owner' && String(row.approval_status || 'Approved').toLowerCase() !== 'approved';
    const message = isEmailChange
      ? `The new email address has been verified for your ${actualScope} account. For security, existing login sessions were revoked; sign in again using the verified email or your User ID.`
      : approvalPending
        ? 'Your owner email is verified. The cafe is still waiting for System Administrator approval; email verification does not approve the cafe automatically.'
        : `Your ${actualScope} email has been verified successfully. You can now continue to the correct role login.`;

    try {
      addAuditLog({
        cafeId: row.cafe_id,
        user: row.full_name || row.username || 'CafeKiosk User',
        userId: String(row.user_id),
        role: actualScope === 'Owner' ? 'Admin' : actualScope,
        action: isEmailChange ? 'Verify New Email' : 'Verify Email',
        category: 'Authentication',
        details: `${actualScope} email verification completed using a one-time role-scoped token.`,
        entityId: String(row.user_id),
        source: 'Email Verification',
        method: req.method,
        path: req.path,
        ip: req.ip || '',
        statusCode: 200,
        success: true
      });
    } catch (_) {}

    return renderEmailVerificationPage(res, {
      ok: true,
      title: isEmailChange ? 'New email verified' : 'Email verified',
      message,
      scope: actualScope,
      statusCode: 200,
      showLogin: !approvalPending
    });
  } catch (error) {
    if (transactionOpen) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error('Email verification error:', error);
    return renderEmailVerificationPage(res, {
      ok: false,
      title: 'Verification failed',
      message: 'CafeKiosk could not verify this link. Please request a new verification email and try again.',
      scope: expectedScope || 'Account',
      statusCode: 500
    });
  } finally {
    connection.release();
  }
};

exports.resendEmailVerification = async (req, res) => {
  const email = safeText(req.body?.email).toLowerCase();
  const requestedScope = safeText(req.body?.role || req.body?.scope);
  const genericMessage = 'If an unverified CafeKiosk account matches those details, a new secure verification link has been sent.';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(200).json({ success: true, message: genericMessage });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) return res.status(503).json({ success: false, message: 'Email verification is temporarily unavailable.' });

  try {
    await ensureAuthSignupSchema(connection);
    const [rows] = await connection.execute(
      `SELECT u.user_id, u.cafe_id, u.full_name, u.username, u.email, u.role, u.is_owner,
              u.email_verified_at, c.cafe_name
         FROM users u
         LEFT JOIN cafes c ON c.cafe_id=u.cafe_id
        WHERE LOWER(u.email)=LOWER(?)
        ORDER BY u.user_id ASC
        LIMIT 5`,
      [email]
    );

    const account = rows.find(row => {
      const scope = verificationScopeForUser({ role: row.role, is_owner: row.is_owner });
      return !requestedScope || scope.toLowerCase() === requestedScope.toLowerCase() ||
        (requestedScope.toLowerCase() === 'admin' && scope === 'Owner');
    });

    if (!account || account.email_verified_at) {
      return res.json({ success: true, message: genericMessage });
    }

    const scope = verificationScopeForUser({ role: account.role, is_owner: account.is_owner });
    const tokenInfo = await issueEmailVerificationToken(connection, {
      userId: account.user_id,
      roleScope: scope,
      purpose: scope === 'Owner' ? 'owner-signup' : 'account-verification'
    });
    if (scope === 'Owner') {
      await connection.execute(
        `UPDATE users SET owner_verify_token_hash=?, owner_verify_expires_at=? WHERE user_id=?`,
        [tokenInfo.tokenHash, tokenInfo.expiresAt, account.user_id]
      );
    }

    const delivery = await sendVerificationTokenEmail(req, account, tokenInfo, { scope });
    return res.json({
      success: true,
      message: genericMessage,
      emailSent: Boolean(delivery?.sent)
    });
  } catch (error) {
    console.error('Resend email verification error:', error);
    return res.status(500).json({ success: false, message: 'Unable to send a new verification email right now.' });
  } finally {
    connection.release();
  }
};

exports.requestCurrentEmailVerification = async (req, res) => {
  const userId = Number(req.user?.userId);
  const cafeId = safeText(req.user?.cafeId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'A database-backed account is required.' });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) return res.status(503).json({ success: false, message: 'Email verification is temporarily unavailable.' });

  try {
    await ensureAuthSignupSchema(connection);
    const [rows] = await connection.execute(
      `SELECT u.user_id, u.cafe_id, u.full_name, u.username, u.email, u.role, u.is_owner,
              u.email_verified_at, c.cafe_name
         FROM users u
         LEFT JOIN cafes c ON c.cafe_id=u.cafe_id
        WHERE u.user_id=? AND u.cafe_id=? LIMIT 1`,
      [userId, cafeId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Account was not found.' });
    const account = rows[0];
    if (!account.email) return res.status(400).json({ success: false, message: 'This account does not have an email address.' });
    if (account.email_verified_at) return res.json({ success: true, alreadyVerified: true, message: 'This role account email is already verified.' });

    const scope = verificationScopeForUser({ role: account.role, is_owner: account.is_owner });
    const tokenInfo = await issueEmailVerificationToken(connection, {
      userId: account.user_id,
      roleScope: scope,
      purpose: scope === 'Owner' ? 'owner-signup' : 'account-verification'
    });
    if (scope === 'Owner') {
      await connection.execute(
        `UPDATE users SET owner_verify_token_hash=?, owner_verify_expires_at=? WHERE user_id=?`,
        [tokenInfo.tokenHash, tokenInfo.expiresAt, account.user_id]
      );
    }
    const delivery = await sendVerificationTokenEmail(req, account, tokenInfo, { scope });
    if (!delivery?.sent) {
      return res.status(502).json({ success: false, message: 'A secure token was created, but the verification email could not be delivered.', emailError: delivery?.error });
    }
    return res.json({ success: true, role: scope, message: `A one-time ${scope} email-verification link was sent to your registered email.` });
  } catch (error) {
    console.error('Request current email verification error:', error);
    return res.status(500).json({ success: false, message: 'Unable to send the verification email right now.' });
  } finally {
    connection.release();
  }
};

exports.createInvite = async (req, res) => {
  const invitedEmail = safeText(req.body?.email).toLowerCase();
  const requestedRole = normalizeRole(req.body?.role) || 'Staff';
  const role = requestedRole === 'Manager' ? 'Manager' : 'Staff';

  if (!invitedEmail) {
    return res.status(400).json({ success: false, message: 'Staff or Manager email address is required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(invitedEmail)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  try {
    const admin = await resolveDatabaseAdmin(req);
    if (!admin?.user_id) {
      return res.status(403).json({ success: false, message: 'Cafe owner/Admin access is required to send staff invitations.' });
    }

    const cafeId = safeText(admin.cafe_id || req.user?.cafeId) || 'cafe-1';
    const invitedBy = Number(admin.user_id);
    const expiresHours = Math.max(1, Math.min(168, Number(req.body?.expiresHours) || 48));

    const [existingUserRows] = await pool.execute(
      `SELECT user_id, full_name, role, status FROM users WHERE cafe_id=? AND LOWER(email)=LOWER(?) LIMIT 1`,
      [cafeId, invitedEmail]
    );
    if (existingUserRows.length && String(existingUserRows[0].status || '').toLowerCase() !== 'inactive') {
      return res.status(409).json({ success: false, message: `${invitedEmail} is already registered to this cafe as ${existingUserRows[0].role || 'an employee'}.` });
    }

    const [cafeRows] = await pool.execute(
      'SELECT cafe_name FROM cafes WHERE cafe_id=? LIMIT 1',
      [cafeId]
    );
    const cafeName = safeText(cafeRows?.[0]?.cafe_name || req.user?.cafeName) || 'CafeKiosk Cafe';
    const inviterName = safeText(admin.full_name || req.user?.displayName || admin.username) || 'Cafe Owner';

    // Revoke older pending links for the same email/cafe/role so the newest
    // email is always the only usable invitation.
    await pool.execute(
      `UPDATE registration_invites
          SET status = 'Revoked'
        WHERE cafe_id = ?
          AND LOWER(invited_email) = LOWER(?)
          AND invited_role = ?
          AND status = 'Pending'`,
      [cafeId, invitedEmail, role]
    );

    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = sha256(token);

    const [inviteResult] = await pool.execute(
      `INSERT INTO registration_invites
       (cafe_id, invited_email, invited_role, token_hash, status, invited_by_user_id, expires_at,
        email_delivery_status, email_delivery_error)
       VALUES (?, ?, ?, ?, 'Pending', ?, DATE_ADD(NOW(), INTERVAL ? HOUR), 'NotSent', NULL)`,
      [cafeId, invitedEmail, role, tokenHash, invitedBy, expiresHours]
    );

    const signupPath = `/staff-signup?token=${encodeURIComponent(token)}`;
    const configuredBaseUrl = safeText(process.env.PUBLIC_APP_URL).replace(/\/$/, '');
    const railwayDomain = safeText(process.env.RAILWAY_PUBLIC_DOMAIN);
    const forwardedProto = safeText(req.headers?.['x-forwarded-proto']).split(',')[0] || req.protocol || 'http';
    const forwardedHost = safeText(req.headers?.['x-forwarded-host']).split(',')[0] || safeText(req.get?.('host'));
    const detectedBaseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : '';
    const publicBaseUrl = configuredBaseUrl || (railwayDomain ? `https://${railwayDomain}` : detectedBaseUrl);
    const inviteUrl = `${String(publicBaseUrl || '').replace(/\/$/, '')}${signupPath}`;

    const delivery = await sendStaffInvitation({
      to: invitedEmail,
      cafeName,
      role,
      inviteUrl,
      expiresHours,
      inviterName,
      inviterEmail: safeText(admin.email)
    });

    await pool.execute(
      `UPDATE registration_invites
          SET email_sent_at = ?,
              email_delivery_status = ?,
              email_delivery_error = ?
        WHERE invite_id = ?`,
      [
        delivery.sent ? new Date() : null,
        delivery.sent ? 'Sent' : (delivery.configured ? 'Failed' : 'NotConfigured'),
        delivery.sent ? null : safeText(delivery.error).slice(0, 1000) || null,
        inviteResult.insertId
      ]
    );

    // If this request came from the built-in fallback Admin, immediately issue
    // a database-backed Admin session so later Admin actions use the real row.
    let refreshedAuthToken = '';
    if (!Number.isFinite(Number(req.user?.userId)) || Number(req.user?.userId) <= 0) {
      const linkedAccount = {
        userId: invitedBy,
        username: admin.username || req.user?.username || 'admin',
        displayName: inviterName,
        role: 'Admin',
        cafeId,
        cafeName,
        isOwner: Boolean(admin.is_owner ?? true)
      };
      const issued = await issueLoginToken(linkedAccount, req);
      refreshedAuthToken = issued.token;
      setRoleCookie(req, res, refreshedAuthToken, 'Admin');
    }

    addAuditLog({
      cafeId,
      user: inviterName,
      userId: invitedBy,
      action: delivery.sent ? 'Staff Invitation Email Sent' : 'Staff Invitation Created',
      category: 'Users',
      role: 'Admin',
      source: 'Admin UI',
      details: `${role} invitation for ${invitedEmail}${delivery.sent ? ' sent by email' : ' created with manual-link fallback'}`,
      req
    });

    return res.status(201).json({
      success: true,
      emailSent: Boolean(delivery.sent),
      emailConfigured: Boolean(delivery.configured),
      message: delivery.sent
        ? `Invitation email sent to ${invitedEmail}.`
        : `Invitation created, but the email could not be sent. Use the backup invitation link.`,
      emailError: delivery.sent ? undefined : delivery.error,
      invitedEmail,
      role,
      cafeName,
      signupPath,
      inviteUrl,
      expiresHours,
      databaseBackedAdmin: true
    });
  } catch (error) {
    console.error('Create invite error:', error);
    if (error?.code === 'ECONNREFUSED' || error?.code === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({
        success: false,
        message: 'MySQL is not reachable. Check the CafeKiosk database connection and try again.'
      });
    }
    if (error?.code === 'CAFEKIOSK_SCHEMA_MISSING') {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: `Unable to create staff invitation${error?.message ? `: ${error.message}` : '.'}`
    });
  }
};

exports.validateInvite = async (req, res) => {
  const token = safeText(req.query?.token);
  if (!token) return res.status(400).json({ success: false, message: 'Invitation token is required.' });

  try {
    const connection = await pool.getConnection();
    try { await ensureAuthSignupSchema(connection); } finally { connection.release(); }
    const [rows] = await pool.execute(
      `SELECT i.invite_id, i.cafe_id, i.invited_email, i.invited_role, i.expires_at, c.cafe_name
       FROM registration_invites i
       JOIN cafes c ON c.cafe_id=i.cafe_id
       WHERE i.token_hash=? AND i.status='Pending' AND i.expires_at>NOW()
       LIMIT 1`,
      [sha256(token)]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'This invitation is invalid, expired, or already used.' });
    const row = rows[0];
    return res.json({
      success: true,
      invite: {
        cafeId: row.cafe_id,
        cafeName: row.cafe_name,
        email: row.invited_email,
        role: row.invited_role,
        expiresAt: row.expires_at
      }
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    return res.status(500).json({ success: false, message: 'Unable to validate invitation.' });
  }
};

exports.staffSignup = async (req, res) => {
  const token = safeText(req.body?.token);
  const fullName = safeText(req.body?.fullName);
  const username = safeText(req.body?.username);
  const password = String(req.body?.password || '');

  if (!token || !fullName || !username || !password) {
    return res.status(400).json({ success: false, message: 'Invitation, full name, username, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) return res.status(503).json({ success: false, message: 'Database is not available.' });

  try {
    await ensureAuthSignupSchema(connection);
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT invite_id, cafe_id, invited_email, invited_role
       FROM registration_invites
       WHERE token_hash=? AND status='Pending' AND expires_at>NOW()
       FOR UPDATE`,
      [sha256(token)]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'This invitation is invalid, expired, or already used.' });
    }

    const invite = rows[0];
    const [existing] = await connection.execute(
      'SELECT user_id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',
      [invite.invited_email]
    );
    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'That email already has a CafeKiosk account.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [userResult] = await connection.execute(
      `INSERT INTO users
       (cafe_id, full_name, username, email, password_hash, role, is_owner, status, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'Active', NOW())`,
      [invite.cafe_id, fullName, username, invite.invited_email, passwordHash, invite.invited_role]
    );

    await connection.execute(
      `UPDATE registration_invites
       SET status='Accepted', accepted_by_user_id=?, accepted_at=NOW()
       WHERE invite_id=?`,
      [userResult.insertId, invite.invite_id]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully.',
      cafeId: invite.cafe_id,
      role: invite.invited_role,
      loginUrl: invite.invited_role === 'Admin' ? '/admin-login' : invite.invited_role === 'Manager' ? '/manager-login' : '/staff-login'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Staff signup error:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'The username is already in use in this cafe.' });
    }
    return res.status(500).json({ success: false, message: 'Unable to create the staff account.' });
  } finally {
    connection.release();
  }
};

exports.socketTicket = async (req, res) => {
  try {
    const issued = socketTicketService.issue({
      user: req.user,
      claims: req.authClaims
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      ticket: issued.ticket,
      expiresInMs: issued.expiresInMs
    });
  } catch (error) {
    console.error('Unable to issue realtime socket ticket:', error.message);
    return res.status(401).json({
      success: false,
      message: 'A current login session is required for realtime access.'
    });
  }
};

exports.me = async (req, res) => {
  const fallbackUser = {
    userId: req.user?.userId || null,
    username: req.user?.username || '',
    email: req.user?.email || '',
    phone: '',
    displayName: req.user?.displayName || req.user?.username || 'CafeKiosk User',
    role: req.user?.role || '',
    cafeId: req.user?.cafeId || 'cafe-1',
    cafeName: '',
    isOwner: Boolean(req.user?.isOwner),
    status: 'Active',
    lastLogin: null,
    createdAt: null,
    databaseBacked: false
  };

  const numericUserId = Number(req.user?.userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return res.json({ success: true, user: fallbackUser });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT
         u.user_id,
         u.username,
         u.email,
         u.phone,
         u.full_name,
         u.role,
         u.is_owner,
         u.status,
         u.last_login,
         u.created_at,
         u.cafe_id,
         c.cafe_name,
         c.status AS cafe_status,
         COALESCE(c.approval_status, 'Approved') AS approval_status,
         c.rejection_reason
       FROM users u
       LEFT JOIN cafes c ON c.cafe_id = u.cafe_id
       WHERE u.user_id = ? AND u.cafe_id = ?
       LIMIT 1`,
      [numericUserId, req.user?.cafeId || 'cafe-1']
    );

    if (!rows.length) {
      return res.json({ success: true, user: fallbackUser });
    }

    const row = rows[0];
    const approvalStatus = String(row.approval_status || 'Approved').toLowerCase();
    if (approvalStatus !== 'approved' || String(row.cafe_status || 'Active').toLowerCase() !== 'active') {
      clearRoleCookie(req, res, row.role || req.user?.role || '');
      return res.status(401).json({
        success: false,
        code: approvalStatus === 'pending' ? 'CAFE_APPROVAL_PENDING' : 'CAFE_NOT_ACTIVE',
        message: approvalStatus === 'pending'
          ? `${row.cafe_name || 'This cafe'} is awaiting System Administrator approval.`
          : row.rejection_reason
            ? `Cafe account is unavailable: ${row.rejection_reason}`
            : 'This cafe account is not active. Please contact the System Administrator.'
      });
    }
    if (String(row.status || '').toLowerCase() !== 'active') {
      clearRoleCookie(req, res, row.role || req.user?.role || '');
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Your CafeKiosk account has been deactivated. Please contact the cafe owner or administrator.'
      });
    }

    return res.json({
      success: true,
      user: {
        userId: row.user_id,
        username: row.username,
        email: row.email || '',
        phone: row.phone || '',
        displayName: row.full_name,
        role: row.role,
        cafeId: row.cafe_id,
        cafeName: row.cafe_name || '',
        isOwner: Boolean(row.is_owner),
        status: row.status,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        databaseBacked: true
      }
    });
  } catch (error) {
    console.warn('Profile lookup failed; using token profile:', error.message);
    return res.json({ success: true, user: fallbackUser });
  }
};


exports.changeUserId = async (req, res) => {
  const newUsername = safeText(req.body?.newUsername || req.body?.username || req.body?.userId);
  const currentPassword = String(req.body?.currentPassword || '');

  if (!newUsername || !currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new User ID are required.' });
  }
  if (!/^[A-Za-z0-9._-]{3,60}$/.test(newUsername)) {
    return res.status(400).json({
      success: false,
      message: 'User ID must be 3 to 60 characters and use only letters, numbers, dots, underscores, or hyphens.'
    });
  }

  const numericUserId = Number(req.user?.userId);
  const cafeId = safeText(req.user?.cafeId) || 'cafe-1';
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return res.status(400).json({ success: false, message: 'A database-backed CafeKiosk Owner account is required.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.cafe_id, u.full_name, u.username, u.email, u.password_hash,
              u.role, u.is_owner, c.cafe_name
         FROM users u
         LEFT JOIN cafes c ON c.cafe_id=u.cafe_id
        WHERE u.user_id=? AND u.cafe_id=? AND u.status='Active'
        LIMIT 1`,
      [numericUserId, cafeId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Owner account was not found.' });

    const owner = rows[0];
    if (!owner.is_owner || normalizeRole(owner.role) !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only the cafe Owner can change the Owner User ID.' });
    }

    const passwordOk = await bcrypt.compare(currentPassword, owner.password_hash || '');
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (String(owner.username || '').toLowerCase() === newUsername.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Choose a User ID that is different from the current one.' });
    }

    const [duplicates] = await pool.execute(
      `SELECT user_id FROM users
        WHERE cafe_id=? AND LOWER(username)=LOWER(?) AND user_id<>?
        LIMIT 1`,
      [cafeId, newUsername, numericUserId]
    );
    if (duplicates.length) {
      return res.status(409).json({ success: false, message: 'That User ID is already being used in this cafe.' });
    }

    await pool.execute(
      `UPDATE users SET username=?, updated_at=NOW() WHERE user_id=? AND cafe_id=?`,
      [newUsername, numericUserId, cafeId]
    );

    const updatedUser = {
      userId: numericUserId,
      username: newUsername,
      email: owner.email || '',
      displayName: owner.full_name,
      role: 'Admin',
      cafeId,
      cafeName: owner.cafe_name || '',
      isOwner: true
    };
    try {
      addAuditLog({
        cafeId,
        user: owner.full_name || newUsername,
        userId: numericUserId,
        role: 'Admin',
        action: 'Change Owner User ID',
        category: 'Users',
        details: `Cafe Owner changed the login User ID from ${owner.username} to ${newUsername}.`,
        entityId: String(numericUserId),
        source: 'Owner Profile',
        method: req.method,
        path: req.path,
        ip: req.ip || '',
        statusCode: 200,
        success: true
      });
    } catch (_) {}

    return res.json({
      success: true,
      message: 'Owner User ID updated successfully.',
      user: publicUser(updatedUser)
    });
  } catch (error) {
    console.error('Change owner User ID error:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'That User ID is already being used in this cafe.' });
    }
    return res.status(500).json({ success: false, message: 'Unable to update the Owner User ID right now.' });
  }
};


exports.changeEmail = async (req, res) => {
  const newEmail = safeText(req.body?.newEmail || req.body?.email).toLowerCase();
  const currentPassword = String(req.body?.currentPassword || '');

  if (!newEmail || !currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new email address are required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(newEmail) || newEmail.length > 190) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  const numericUserId = Number(req.user?.userId);
  const cafeId = safeText(req.user?.cafeId) || 'cafe-1';
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return res.status(400).json({ success: false, message: 'A database-backed CafeKiosk account is required to change the login email.' });
  }

  const connection = await pool.getConnection().catch(() => null);
  if (!connection) return res.status(503).json({ success: false, message: 'Database is unavailable. Please try again shortly.' });

  let transactionOpen = false;
  try {
    await ensureAuthSignupSchema(connection);
    await connection.beginTransaction();
    transactionOpen = true;

    const [rows] = await connection.execute(
      `SELECT u.user_id, u.cafe_id, u.full_name, u.username, u.email, u.password_hash,
              u.role, u.is_owner, c.cafe_name
         FROM users u
         LEFT JOIN cafes c ON c.cafe_id=u.cafe_id
        WHERE u.user_id=? AND u.cafe_id=? AND u.status='Active'
        LIMIT 1
        FOR UPDATE`,
      [numericUserId, cafeId]
    );
    if (!rows.length) {
      await connection.rollback(); transactionOpen = false;
      return res.status(404).json({ success: false, message: 'Account was not found.' });
    }

    const account = rows[0];
    const passwordOk = await bcrypt.compare(currentPassword, account.password_hash || '');
    if (!passwordOk) {
      await connection.rollback(); transactionOpen = false;
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (String(account.email || '').toLowerCase() === newEmail) {
      await connection.rollback(); transactionOpen = false;
      return res.status(400).json({ success: false, message: 'Enter an email address that is different from your current email.' });
    }

    const [duplicates] = await connection.execute(
      `SELECT user_id FROM users WHERE LOWER(email)=LOWER(?) AND user_id<>? LIMIT 1`,
      [newEmail, numericUserId]
    );
    if (duplicates.length) {
      await connection.rollback(); transactionOpen = false;
      return res.status(409).json({ success: false, message: 'That email address is already being used by another CafeKiosk account.' });
    }

    const scope = verificationScopeForUser({ role: account.role, is_owner: account.is_owner });
    const tokenInfo = await issueEmailVerificationToken(connection, {
      userId: numericUserId,
      roleScope: scope,
      purpose: 'email-change',
      pendingEmail: newEmail
    });

    await connection.commit();
    transactionOpen = false;

    const delivery = await sendVerificationTokenEmail(req, account, tokenInfo, {
      scope,
      pendingEmail: newEmail
    });
    if (!delivery?.sent) {
      return res.status(502).json({
        success: false,
        pendingVerification: true,
        message: 'The email change was not applied. CafeKiosk created a secure verification request, but the verification email could not be delivered.',
        emailError: delivery?.error
      });
    }

    try {
      addAuditLog({
        cafeId,
        user: account.full_name || account.username || 'CafeKiosk User',
        userId: numericUserId,
        role: account.role || req.user?.role || '',
        action: 'Request Email Change',
        category: 'Users',
        details: `Requested a role-scoped verification link before changing the login/recovery email to ${newEmail}.`,
        entityId: String(numericUserId),
        source: 'Profile',
        method: req.method,
        path: req.path,
        ip: req.ip || '',
        statusCode: 200,
        success: true
      });
    } catch (_) {}

    return res.json({
      success: true,
      pendingVerification: true,
      role: scope,
      pendingEmail: newEmail,
      currentEmail: account.email || '',
      message: `A secure ${scope} verification link was sent to ${newEmail}. Your current email stays unchanged until that link is verified.`
    });
  } catch (error) {
    if (transactionOpen) { try { await connection.rollback(); } catch (_) {} }
    console.error('Request email change error:', error);
    return res.status(500).json({ success: false, message: 'Unable to prepare the email verification right now.' });
  } finally {
    connection.release();
  }
};

exports.changePassword = async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
  }

  const numericUserId = Number(req.user?.userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'The built-in demo account password cannot be changed. Use a database-backed CafeKiosk account.'
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT password_hash
       FROM users
       WHERE user_id = ? AND cafe_id = ? AND status = 'Active'
       LIMIT 1`,
      [numericUserId, req.user?.cafeId || 'cafe-1']
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Account was not found.' });
    }

    const validCurrentPassword = await bcrypt.compare(currentPassword, rows[0].password_hash || '');
    if (!validCurrentPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.execute(
      `UPDATE users
       SET password_hash = ?, updated_at = NOW(), failed_attempts = 0, lock_until = NULL, must_change_password = 0
       WHERE user_id = ? AND cafe_id = ?`,
      [passwordHash, numericUserId, req.user?.cafeId || 'cafe-1']
    );

    await revokeAllUserSessions(numericUserId);
    clearRoleCookie(req, res, req.user?.role || '');

    return res.json({
      success: true,
      sessionRevoked: true,
      message: 'Password updated successfully. For security, all devices were signed out. Please log in again.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to change password right now.' });
  }
};


exports.setApprovalPin = async (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (!['Admin', 'Manager'].includes(role)) {
    return res.status(403).json({ success: false, code: 'APPROVAL_PIN_ROLE_FORBIDDEN', message: 'Only an Admin or Manager can set an approval PIN.' });
  }

  const pin = String(req.body?.pin || '').trim();
  const confirmPin = String(req.body?.confirmPin || '').trim();
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ success: false, code: 'APPROVAL_PIN_FORMAT', message: 'PIN must contain 4 to 6 digits.' });
  }
  if (pin !== confirmPin) {
    return res.status(400).json({ success: false, code: 'APPROVAL_PIN_CONFIRM_MISMATCH', message: 'PIN confirmation does not match.' });
  }

  const numericUserId = Number(req.user?.userId);
  const cafeId = String(req.user?.cafeId || '').trim();
  if (!Number.isFinite(numericUserId) || numericUserId <= 0 || !cafeId) {
    return res.status(400).json({
      success: false,
      code: 'APPROVAL_PIN_ACCOUNT_REQUIRED',
      message: 'Please log out and log back in with your database-backed Admin or Manager account, then set the PIN again.'
    });
  }

  let connection = null;
  let transactionOpen = false;

  try {
    await ensureApprovalPinSchema();

    /*
     * Keep save + read-back verification in ONE transaction/connection.
     * Previously the UPDATE was autocommitted before the verification SELECT.
     * That meant a temporary error during the SELECT could show a failure even
     * though the new PIN had already been permanently saved.  The transaction
     * makes the result unambiguous: success commits; any error rolls back.
     */
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const [accounts] = await connection.execute(
      `SELECT user_id, full_name, username, role, status
         FROM users
        WHERE user_id = ? AND cafe_id = ?
        LIMIT 1
        FOR UPDATE`,
      [numericUserId, cafeId]
    );

    const account = accounts[0];
    if (!account || !['Admin', 'Manager'].includes(normalizeRole(account.role)) || String(account.status || '').toLowerCase() !== 'active') {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({
        success: false,
        code: 'APPROVAL_PIN_ACCOUNT_NOT_ACTIVE',
        message: 'Your current session does not match an active Admin/Manager database account. Log out, log back in, and try again.'
      });
    }

    const hash = await bcrypt.hash(pin, 10);
    const [updateResult] = await connection.execute(
      `UPDATE users
          SET approval_pin_hash = ?, approval_pin_updated_at = NOW()
        WHERE user_id = ? AND cafe_id = ?`,
      [hash, numericUserId, cafeId]
    );

    if (Number(updateResult?.affectedRows || 0) !== 1) {
      const error = new Error('The Admin/Manager account was not updated.');
      error.code = 'APPROVAL_PIN_UPDATE_MISSED';
      throw error;
    }

    const [savedRows] = await connection.execute(
      `SELECT approval_pin_hash, approval_pin_updated_at
         FROM users
        WHERE user_id = ? AND cafe_id = ?
        LIMIT 1`,
      [numericUserId, cafeId]
    );

    const savedHash = String(savedRows[0]?.approval_pin_hash || '');
    const verified = Boolean(savedHash) && await bcrypt.compare(pin, savedHash);
    if (!verified) {
      const error = new Error('The PIN could not be verified after it was stored.');
      error.code = 'APPROVAL_PIN_PERSISTENCE_FAILED';
      throw error;
    }

    await connection.commit();
    transactionOpen = false;
    const approvalId = await ensureUserApprovalId(cafeId, numericUserId, role);

    // Audit logging is intentionally outside the transaction: an audit-log
    // problem must never turn a successful PIN change into a false failure.
    await addAuditLog({
      cafeId,
      userId: numericUserId,
      userName: req.user?.displayName || req.user?.username || role,
      username: req.user?.username || '',
      role,
      action: 'Approval PIN Updated',
      category: 'Security',
      details: `${role} updated their refund/void approval PIN.`,
      source: 'Profile'
    }).catch(() => {});

    return res.json({
      success: true,
      hasPin: true,
      approvalId,
      role,
      updatedAt: savedRows[0]?.approval_pin_updated_at || null,
      message: 'Approval PIN saved and verified successfully.'
    });
  } catch (error) {
    if (connection && transactionOpen) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Approval PIN rollback error:', rollbackError);
      }
      transactionOpen = false;
    }

    console.error('Set approval PIN error:', error);
    const schemaError = ['CAFEKIOSK_SCHEMA_MISSING', 'APPROVAL_PIN_SCHEMA_INCOMPLETE'].includes(error?.code);
    return res.status(500).json({
      success: false,
      code: error?.code || 'APPROVAL_PIN_SAVE_FAILED',
      message: schemaError
        ? 'Approval PIN database fields are not ready. Redeploy this version once so CafeKiosk can apply the PIN migration.'
        : 'Unable to save and verify the approval PIN right now.'
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.approvalPinStatus = async (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (!['Admin', 'Manager'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Only an Admin or Manager can view approval PIN status.' });
  }
  try {
    const status = await getUserApprovalPinStatus(req.user?.cafeId, req.user?.userId);
    if (!status.found) {
      return res.status(404).json({ success: false, code: 'APPROVAL_PIN_ACCOUNT_NOT_FOUND', message: 'Your Admin/Manager database account was not found.' });
    }
    return res.json({
      success: true,
      hasPin: status.hasPin,
      approvalId: status.approvalId || '',
      updatedAt: status.updatedAt,
      role: status.role,
      recoverable: false
    });
  } catch (error) {
    console.error('Approval PIN status error:', error);
    return res.status(500).json({ success: false, code: error?.code || 'APPROVAL_PIN_STATUS_FAILED', message: 'Unable to read approval PIN status.' });
  }
};

exports.verifyApprovalPin = async (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (!['Admin', 'Manager', 'Staff'].includes(role)) {
    return res.status(403).json({ success: false, message: 'An authenticated cafe account is required.' });
  }
  try {
    const selfOnly = String(req.body?.scope || '').toLowerCase() === 'self';
    const result = selfOnly && ['Admin', 'Manager'].includes(role)
      ? await verifyUserApprovalPin(req.user?.cafeId, req.user?.userId, req.body?.pin)
      : await verifyCafeApprovalPin(req.user?.cafeId, req.body?.pin, req.body?.approvalId);

    if (!result.valid) {
      return res.status(403).json({ success: false, code: result.code, message: result.message });
    }
    return res.json({
      success: true,
      message: selfOnly
        ? 'This PIN matches the PIN saved on your account.'
        : `Approved by ${result.approver?.role || 'supervisor'} ${result.approver?.name || ''}`.trim(),
      approver: result.approver
    });
  } catch (error) {
    console.error('Verify approval PIN error:', error);
    return res.status(500).json({ success: false, code: error?.code || 'APPROVAL_PIN_VERIFY_FAILED', message: 'Unable to verify the approval PIN right now.' });
  }
};

exports.logout = async (req, res) => {
  const role = req.user?.role || req.body?.role || '';
  const sessionId = safeText(req.authClaims?.sid || req.user?.sid);
  try {
    if (sessionId) await revokeSession(sessionId, req.user?.userId);
  } catch (error) {
    // Fail closed for the browser session by clearing the cookie even if the
    // revocation write is temporarily unavailable. The session DB check will
    // still be enforced on future authenticated requests.
    console.error('Session revocation during logout failed:', error.message);
  }
  clearRoleCookie(req, res, role);
  return res.json({ success: true, role: normalizeRole(role), message: 'Logged out successfully.' });
};

exports.health = async (req, res) => {
  let database = 'offline';
  try {
    await pool.query('SELECT 1');
    database = 'online';
  } catch (_) {}
  return res.json({
    success: true,
    service: 'CafeKiosk authentication',
    database,
    simultaneousSessions: true,
    roles: ['Admin', 'Staff', 'Manager'],
    signup: { owner: true, staffInvite: true },
    passwordRecovery: { enabled: true, provider: getEmailConfig().provider, emailConfigured: getEmailConfig().configured, expiresMinutes: PASSWORD_RESET_EXPIRES_MINUTES },
    ownerApproval: { required: true, method: 'System Administrator' },
    loginProtection: { temporaryLockout: true, failedAttemptsBeforeLock: LOGIN_LOCK_THRESHOLD, lockMinutes: LOGIN_LOCK_MINUTES },
    authentication: { serverSideSessions: true, browserTokenStorage: false, currentDatabaseRoleAuthoritative: true, sessionHours: SESSION_HOURS },
    cookies: COOKIE_NAMES
  });
};
