const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/dbPool');
const { addAuditLog } = require('../services/auditLogStore');
const kioskAccessStore = require('../services/kioskAccessStore');

const JWT_SECRET = process.env.JWT_SECRET || 'cafekiosk-demo-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

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
  await addColumnIfMissing(connection, 'users', 'must_change_password', 'TINYINT(1) NOT NULL DEFAULT 0');
  await addColumnIfMissing(connection, 'users', 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumnIfMissing(connection, 'users', 'approval_pin_hash', 'VARCHAR(255) NULL');
  await addColumnIfMissing(connection, 'users', 'approval_pin_updated_at', 'DATETIME NULL');

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
        `SELECT user_id, cafe_id, username, role, is_owner
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
      `SELECT user_id, cafe_id, username, role, is_owner
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

function signToken(user) {
  return jwt.sign({
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    cafeId: user.cafeId,
    cafeName: user.cafeName || '',
    isOwner: Boolean(user.isOwner)
  }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function publicUser(user) {
  return {
    userId: user.userId,
    username: user.username,
    email: user.email || '',
    displayName: user.displayName,
    role: user.role,
    cafeId: user.cafeId,
    isOwner: Boolean(user.isOwner)
  };
}

function loginRedirect(role) {
  const key = roleKey(role);
  if (key === 'admin') return '/Admin/dashboard.php';
  if (key === 'manager') return '/manager-dashboard';
  return '/staff-dashboard';
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https'),
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
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
      isOwner: true
    },
    {
      userId: process.env.STAFF_USER_ID || 'staff',
      username: process.env.STAFF_USER_ID || 'staff',
      password: process.env.STAFF_PASSWORD || 'staff123',
      displayName: process.env.STAFF_DISPLAY_NAME || 'CafeKiosk Staff',
      role: 'Staff',
      cafeId: process.env.CAFE_ID || 'cafe-1',
      isOwner: false
    }
  ];
}

async function findDbAccount(identifier, requestedCafeId, requestedRole) {
  const id = safeText(identifier).toLowerCase();
  if (!id) return null;

  const selectFields = `
    SELECT u.user_id, u.cafe_id, u.full_name, u.username, u.email,
           u.password_hash, u.role, u.is_owner, u.status,
           c.cafe_name, c.status AS cafe_status,
           COALESCE(c.approval_status, 'Approved') AS approval_status,
           c.rejection_reason
      FROM users u
      JOIN cafes c ON c.cafe_id = u.cafe_id`;

  let rows;
  if (id.includes('@')) {
    [rows] = await pool.execute(
      `${selectFields}
       WHERE LOWER(u.email)=?
       LIMIT 2`,
      [id]
    );
  } else {
    const roleFilter = requestedRole ? ' AND u.role=?' : '';
    const params = requestedRole ? [id, requestedCafeId, requestedRole] : [id, requestedCafeId];
    [rows] = await pool.execute(
      `${selectFields}
       WHERE LOWER(u.username)=? AND u.cafe_id=?${roleFilter}
       LIMIT 2`,
      params
    );

    if (!rows.length) {
      [rows] = await pool.execute(
        `${selectFields}
         WHERE LOWER(u.username)=?${requestedRole ? ' AND u.role=?' : ''}
         LIMIT 3`,
        requestedRole ? [id, requestedRole] : [id]
      );
      if (rows.length > 1) {
        const error = new Error('This User ID exists in more than one cafe. Log in using your email address instead.');
        error.statusCode = 409;
        throw error;
      }
    }
  }

  if (!rows.length) return null;
  const row = rows[0];
  return {
    userId: row.user_id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.full_name,
    role: row.role,
    cafeId: row.cafe_id,
    cafeName: row.cafe_name || row.cafe_id,
    isOwner: Boolean(row.is_owner),
    status: row.status,
    cafeStatus: row.cafe_status,
    approvalStatus: row.approval_status || 'Approved',
    rejectionReason: row.rejection_reason || ''
  };
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
  const action = newStatus === 'Inactive' ? 'Deactivate User' : 'Activate User';
  const verb = newStatus === 'Inactive' ? 'deactivated' : 'activated';
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
    path: req.originalUrl || req.path || '',
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
    reason: 'account-deactivated',
    message: 'Your CafeKiosk account was deactivated by an administrator.'
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
        refreshedAuthToken = signToken(linked);
        setRoleCookie(req, res, refreshedAuthToken, 'Admin');
      }
    }

    const connection = await pool.getConnection();
    try {
      await ensureAuthSignupSchema(connection);
      const [rows] = await connection.execute(
        `SELECT user_id, full_name, username, email, phone, role, is_owner,
                status, last_login, created_at, updated_at
           FROM users
          WHERE cafe_id = ?
          ORDER BY is_owner DESC, FIELD(role,'Admin','Manager','Staff'), full_name ASC`,
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
          isCurrentUser: Number(row.user_id) === Number(effectiveUserId)
        })),
        authToken: refreshedAuthToken || undefined,
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
  const refreshed = signToken(linked);
  setRoleCookie(req, res, refreshed, 'Admin');
  res.locals.refreshedAuthToken = refreshed;
  return numericUserId;
}

exports.createUser = async (req, res) => {
  try { await ensureDatabaseActor(req, res); } catch (_) {}
  const cafeId = safeText(req.user?.cafeId) || 'cafe-1';
  const fullName = safeText(req.body?.name || req.body?.fullName);
  const username = safeText(req.body?.username || req.body?.userId);
  const email = safeText(req.body?.email).toLowerCase();
  const phone = safeText(req.body?.phone);
  const role = normalizeRole(req.body?.role) || 'Staff';
  const status = String(req.body?.status || 'Active') === 'Inactive' ? 'Inactive' : 'Active';
  const password = String(req.body?.password || '');

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
        path: req.originalUrl,
        ip: req.ip || '',
        statusCode: 201,
        success: true
      });

      return res.status(201).json({ success: true, message: 'User account created.', userId: result.insertId, authToken: res.locals.refreshedAuthToken || undefined });
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
        path: req.originalUrl,
        ip: req.ip || '',
        statusCode: 200,
        success: true
      });
      return res.json({ success: true, message: 'User account updated.', authToken: res.locals.refreshedAuthToken || undefined });
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
      message: `${target.full_name}'s account is now ${newStatus.toLowerCase()}.`,
      user: { id: String(target.user_id), status: newStatus },
      kickedOut: newStatus === 'Inactive',
      authToken: res.locals.refreshedAuthToken || undefined
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
  const requestedCafeId = safeText(req.body?.cafeId) || 'cafe-1';

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'User ID/email and password are required.' });
  }

  let account = null;
  let dbAvailable = true;

  try {
    account = await findDbAccount(username, requestedCafeId, requestedRole);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.warn('Database login unavailable; trying local demo accounts:', error.message);
    dbAvailable = false;
  }

  if (account) {
    const passwordOK = await bcrypt.compare(password, account.passwordHash || '');
    if (!passwordOK) {
      await recordLoginAttempt(username, account.userId, 'Failed', req);
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

    if (requestedRole && requestedRole !== account.role && !(requestedRole === 'Admin' && account.role === 'Manager')) {
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

  const token = signToken(account);
  setRoleCookie(req, res, token, account.role);

  return res.json({
    success: true,
    message: 'Login successful.',
    token,
    sessionRole: account.role,
    user: publicUser(account),
    redirect: loginRedirect(account.role)
  });
};

exports.ownerSignup = async (req, res) => {
  const cafeName = safeText(req.body?.cafeName);
  const fullName = safeText(req.body?.fullName);
  const email = safeText(req.body?.email).toLowerCase();
  const phone = safeText(req.body?.phone);
  const username = safeText(req.body?.username);
  const password = String(req.body?.password || '');

  if (!cafeName || !fullName || !email || !username || !password) {
    return res.status(400).json({ success: false, message: 'Cafe name, owner name, email, username, and password are required.' });
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
       (cafe_id, full_name, username, email, phone, password_hash, role, is_owner, status, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Admin', 1, 'Pending', NOW())`,
      [cafeId, fullName, username, email, phone || null, passwordHash]
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

    return res.status(201).json({
      success: true,
      pendingApproval: true,
      message: 'Registration submitted. A System Administrator must approve this cafe account before the owner can sign in.',
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

exports.createInvite = async (req, res) => {
  const invitedEmail = safeText(req.body?.email).toLowerCase();
  const requestedRole = normalizeRole(req.body?.role) || 'Staff';
  const role = requestedRole === 'Admin' ? 'Admin' : requestedRole === 'Manager' ? 'Manager' : 'Staff';

  if (!invitedEmail) {
    return res.status(400).json({ success: false, message: 'Staff email address is required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(invitedEmail)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid staff email address.' });
  }

  try {
    const admin = await resolveDatabaseAdmin(req);
    if (!admin?.user_id) {
      return res.status(403).json({ success: false, message: 'Admin access is required to create staff invitations.' });
    }

    const cafeId = safeText(admin.cafe_id || req.user?.cafeId) || 'cafe-1';
    const invitedBy = Number(admin.user_id);

    // Avoid issuing several active links to the same email/role/cafe. Revoke
    // old pending links first so the newest link is the one staff should use.
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
    const expiresHours = Math.max(1, Math.min(168, Number(req.body?.expiresHours) || 48));

    await pool.execute(
      `INSERT INTO registration_invites
       (cafe_id, invited_email, invited_role, token_hash, status, invited_by_user_id, expires_at)
       VALUES (?, ?, ?, ?, 'Pending', ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
      [cafeId, invitedEmail, role, tokenHash, invitedBy, expiresHours]
    );

    // If this request came from the built-in fallback Admin, immediately issue
    // a new database-backed Admin session so profile/password features also work
    // without requiring the owner to log out first.
    let refreshedAuthToken = '';
    if (!Number.isFinite(Number(req.user?.userId)) || Number(req.user?.userId) <= 0) {
      const linkedAccount = {
        userId: invitedBy,
        username: admin.username || req.user?.username || 'admin',
        displayName: req.user?.displayName || process.env.ADMIN_DISPLAY_NAME || 'CafeKiosk Administrator',
        role: 'Admin',
        cafeId,
        isOwner: Boolean(admin.is_owner ?? true)
      };
      refreshedAuthToken = signToken(linkedAccount);
      setRoleCookie(req, res, refreshedAuthToken, 'Admin');
    }

    return res.status(201).json({
      success: true,
      message: 'Staff invitation created.',
      token,
      signupPath: `/staff-signup?token=${encodeURIComponent(token)}`,
      expiresHours,
      databaseBackedAdmin: true,
      authToken: refreshedAuthToken || undefined
    });
  } catch (error) {
    console.error('Create invite error:', error);
    if (error?.code === 'ECONNREFUSED' || error?.code === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({
        success: false,
        message: 'MySQL is not reachable. Start MySQL in XAMPP, then try creating the invitation again.'
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
       SET password_hash = ?, updated_at = NOW(), failed_attempts = 0, lock_until = NULL
       WHERE user_id = ? AND cafe_id = ?`,
      [passwordHash, numericUserId, req.user?.cafeId || 'cafe-1']
    );

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to change password right now.' });
  }
};


exports.setApprovalPin = async (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (!['Admin', 'Manager'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Only an Admin or Manager can set an approval PIN.' });
  }

  const pin = String(req.body?.pin || '').trim();
  const confirmPin = String(req.body?.confirmPin || '').trim();
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ success: false, message: 'PIN must contain 4 to 6 digits.' });
  }
  if (pin !== confirmPin) {
    return res.status(400).json({ success: false, message: 'PIN confirmation does not match.' });
  }

  const numericUserId = Number(req.user?.userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return res.status(400).json({ success: false, message: 'A database-backed Admin or Manager account is required.' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      await ensureAuthSignupSchema(connection);
    } finally {
      connection.release();
    }
    const hash = await bcrypt.hash(pin, 10);
    const [result] = await pool.execute(
      `UPDATE users
          SET approval_pin_hash = ?, approval_pin_updated_at = NOW(), updated_at = NOW()
        WHERE user_id = ? AND cafe_id = ? AND role IN ('Admin','Manager') AND status = 'Active'`,
      [hash, numericUserId, req.user?.cafeId || 'cafe-1']
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Active Admin/Manager account was not found.' });
    }
    await addAuditLog({
      cafeId: req.user?.cafeId || 'cafe-1',
      userId: numericUserId,
      userName: req.user?.displayName || req.user?.username || role,
      username: req.user?.username || '',
      role,
      action: 'Approval PIN Updated',
      category: 'Security',
      details: `${role} updated their refund/void approval PIN.`,
      source: 'Profile'
    }).catch(() => {});
    return res.json({ success: true, message: 'Approval PIN saved successfully.' });
  } catch (error) {
    console.error('Set approval PIN error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save the approval PIN right now.' });
  }
};

exports.approvalPinStatus = async (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (!['Admin', 'Manager'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Only an Admin or Manager can view approval PIN status.' });
  }
  try {
    const connection = await pool.getConnection();
    try { await ensureAuthSignupSchema(connection); } finally { connection.release(); }
    const [rows] = await pool.execute(
      `SELECT approval_pin_hash IS NOT NULL AS has_pin, approval_pin_updated_at
         FROM users WHERE user_id = ? AND cafe_id = ? LIMIT 1`,
      [Number(req.user?.userId), req.user?.cafeId || 'cafe-1']
    );
    return res.json({ success: true, hasPin: Boolean(rows[0]?.has_pin), updatedAt: rows[0]?.approval_pin_updated_at || null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to read approval PIN status.' });
  }
};

exports.logout = (req, res) => {
  const role = req.user?.role || req.body?.role || '';
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
    cookies: COOKIE_NAMES
  });
};
