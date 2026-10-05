const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbPool = require('../config/dbPool');
const kioskAccessStore = require('../services/kioskAccessStore');
const ensurePanelistUpgrades = require('../ensure-panelist-upgrades');
const { addAuditLog } = require('../services/auditLogStore');
const { makeRateLimit } = require('../middleware/securityRateLimit');
const { createSecurityAlert, getRecentSecurityAlerts, clientIp } = require('../services/securityAlertService');
const {
  SYSTEM_ADMIN_COOKIE,
  requireSystemAdminApi
} = require('../middleware/systemAdminMiddleware');

const router = express.Router();
const { JWT_SECRET, isProduction } = require('../config/security');

const SYSTEM_ADMIN_MAX_FAILED_ATTEMPTS = Math.max(3, Number(process.env.SYSTEM_ADMIN_MAX_FAILED_ATTEMPTS || 5));
const SYSTEM_ADMIN_WARNING_THRESHOLD = Math.min(SYSTEM_ADMIN_MAX_FAILED_ATTEMPTS - 1, Math.max(2, Number(process.env.SYSTEM_ADMIN_WARNING_THRESHOLD || 3)));
const SYSTEM_ADMIN_LOCK_MINUTES = Math.max(5, Number(process.env.SYSTEM_ADMIN_LOCK_MINUTES || 15));
const systemAdminFailures = new Map();
const systemAdminLoginLimiter = makeRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Too many System Administrator login attempts. Please wait before trying again.'
});

function text(value) {
  return String(value ?? '').trim();
}


function makeCafeId(cafeName) {
  const base = text(cafeName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'cafe';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

async function optionalExecute(connection, sql, params = []) {
  try {
    return await connection.execute(sql, params);
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_FIELD_ERROR') return null;
    throw error;
  }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left ?? ''));
  const b = Buffer.from(String(right ?? ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction() || Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https'),
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
    priority: 'high'
  };
}

function clearCookieOptions(req) {
  const options = cookieOptions(req);
  delete options.maxAge;
  return options;
}

function systemAdminProfile() {
  return {
    userId: 'system-admin',
    username: process.env.SYSTEM_ADMIN_USER || 'systemadmin',
    displayName: process.env.SYSTEM_ADMIN_DISPLAY_NAME || 'CafeKiosk IT Monitor',
    role: 'SystemAdmin',
    scope: 'platform-monitor'
  };
}

router.post('/login', systemAdminLoginLimiter, async (req, res) => {
  // Project-owner fixed System Administrator credential. Railway variables are
  // accepted as an additional legacy alias, but can no longer override this.
  const expectedUser = 'systemadmin';
  const expectedPassword = 'CafeMonitor2026!';
  const configuredUser = text(process.env.SYSTEM_ADMIN_USER);
  const configuredPassword = String(process.env.SYSTEM_ADMIN_PASSWORD || '');
  const username = text(req.body?.username);
  const rawPassword = String(req.body?.password || '');
  // Passwords remain case-sensitive. For tablet copy/paste only, tolerate
  // accidental leading/trailing whitespace when the configured password itself
  // does not intentionally contain edge spaces.
  const password = safeEqual(rawPassword, expectedPassword)
    ? rawPassword
    : (expectedPassword === expectedPassword.trim() && safeEqual(rawPassword.trim(), expectedPassword)
      ? rawPassword.trim()
      : rawPassword);
  const sourceIp = clientIp(req) || 'unknown';
  const guardKey = `${sourceIp}|${username.toLowerCase() || 'unknown'}`;
  const now = Date.now();
  let guard = systemAdminFailures.get(guardKey) || { failures: 0, lockUntil: 0 };
  if (guard.lockUntil && guard.lockUntil <= now) {
    guard = { failures: 0, lockUntil: 0 };
    systemAdminFailures.set(guardKey, guard);
  }

  if (guard.lockUntil > now) {
    const minutes = Math.max(1, Math.ceil((guard.lockUntil - now) / 60000));
    return res.status(429).json({
      success: false,
      code: 'SYSTEM_ADMIN_TEMPORARILY_LOCKED',
      message: `Too many failed System Administrator sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
    });
  }

  const fixedPair = safeEqual(username.toLowerCase(), expectedUser.toLowerCase()) && safeEqual(password, expectedPassword);
  const configuredPair = Boolean(configuredUser && configuredPassword) &&
    safeEqual(username.toLowerCase(), configuredUser.toLowerCase()) &&
    safeEqual(rawPassword.trim(), configuredPassword.trim());
  const validUser = fixedPair || configuredPair;
  const validPassword = fixedPair || configuredPair;
  if (!validUser || !validPassword) {
    guard.failures += 1;

    if (guard.failures >= SYSTEM_ADMIN_MAX_FAILED_ATTEMPTS) {
      guard.lockUntil = now + SYSTEM_ADMIN_LOCK_MINUTES * 60 * 1000;
      systemAdminFailures.set(guardKey, guard);
      await createSecurityAlert({
        alertType: 'SYSTEM_ADMIN_BRUTE_FORCE_LOCK',
        severity: 'high',
        sourceIp,
        dedupeMinutes: SYSTEM_ADMIN_LOCK_MINUTES,
        message: `Security Alert: repeated failed System Administrator sign-in attempts triggered a ${SYSTEM_ADMIN_LOCK_MINUTES}-minute temporary lock.`
      });
      return res.status(429).json({
        success: false,
        code: 'SYSTEM_ADMIN_TEMPORARILY_LOCKED',
        message: `Too many failed System Administrator sign-in attempts. Login is temporarily locked for ${SYSTEM_ADMIN_LOCK_MINUTES} minutes.`
      });
    }

    systemAdminFailures.set(guardKey, guard);
    if (guard.failures === SYSTEM_ADMIN_WARNING_THRESHOLD) {
      await createSecurityAlert({
        alertType: 'SYSTEM_ADMIN_LOGIN_WARNING',
        severity: 'medium',
        sourceIp,
        dedupeMinutes: 10,
        message: `Security Alert: repeated failed attempts were detected against the System Administrator login. ${guard.failures} consecutive failures have been recorded from the same source.`
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid System Administrator credentials.'
    });
  }

  systemAdminFailures.delete(guardKey);
  const user = systemAdminProfile();
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
  res.cookie(SYSTEM_ADMIN_COOKIE, token, cookieOptions(req));

  return res.json({
    success: true,
    user,
    redirect: '/SystemAdmin/dashboard.php'
  });
});

router.post('/logout', requireSystemAdminApi, (req, res) => {
  res.clearCookie(SYSTEM_ADMIN_COOKIE, clearCookieOptions(req));
  return res.json({ success: true });
});

router.get('/me', requireSystemAdminApi, (req, res) => {
  return res.json({
    success: true,
    user: req.systemAdmin
  });
});

async function fetchSocketCounts(io, cafeId) {
  if (!io) {
    return { admin: 0, pos: 0, orderQueue: 0, kiosk: 0, total: 0 };
  }

  const roomNames = {
    admin: `admin-${cafeId}`,
    pos: `pos-${cafeId}`,
    orderQueue: `order-queue-${cafeId}`,
    kiosk: `kiosk-${cafeId}`
  };

  const [adminSockets, posSockets, queueSockets, kioskSockets] = await Promise.all([
    io.in(roomNames.admin).fetchSockets(),
    io.in(roomNames.pos).fetchSockets(),
    io.in(roomNames.orderQueue).fetchSockets(),
    io.in(roomNames.kiosk).fetchSockets()
  ]);

  const counts = {
    admin: adminSockets.length,
    pos: posSockets.length,
    orderQueue: queueSockets.length,
    kiosk: kioskSockets.length
  };

  return {
    ...counts,
    total: counts.admin + counts.pos + counts.orderQueue + counts.kiosk
  };
}

function mapRows(rows, key, valueKey) {
  return new Map((rows || []).map((row) => [String(row[key]), row[valueKey]]));
}

async function safeQuery(sql, params = []) {
  try {
    const [rows] = await dbPool.execute(sql, params);
    return rows;
  } catch (_) {
    return [];
  }
}

function latestDate(...values) {
  const valid = values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => Number.isFinite(date.getTime()));

  if (!valid.length) return null;
  return new Date(Math.max(...valid.map((date) => date.getTime()))).toISOString();
}

function buildIssueList(cafe) {
  const issues = [];

  if (String(cafe.approvalStatus || 'Approved').toLowerCase() === 'pending') {
    issues.push({ severity: 'medium', message: 'Cafe registration is waiting for System Administrator approval.' });
  } else if (String(cafe.approvalStatus || 'Approved').toLowerCase() === 'rejected') {
    issues.push({ severity: 'medium', message: 'Cafe registration was rejected.' });
  }

  if (String(cafe.accountStatus).toLowerCase() !== 'active') {
    issues.push({ severity: 'medium', message: 'Cafe account is inactive.' });
  }

  if (cafe.connections.pos === 0) {
    issues.push({ severity: 'info', message: 'No live POS connection.' });
  }

  if (!cafe.kioskOnline) {
    issues.push({ severity: 'medium', message: 'Kiosk access is not configured or is disabled.' });
  }

  if (cafe.delayedOrders > 0) {
    issues.push({
      severity: 'high',
      message: `${cafe.delayedOrders} order${cafe.delayedOrders === 1 ? '' : 's'} pending/preparing for more than 15 minutes.`
    });
  }

  if (cafe.failedLogins24h >= 3) {
    issues.push({
      severity: 'medium',
      message: `${cafe.failedLogins24h} failed or locked login attempts in the last 24 hours.`
    });
  }

  return issues;
}

function overallStatus(cafe) {
  const hasImportantIssue = cafe.issues.some((issue) => issue.severity === 'high' || issue.severity === 'medium');

  if (String(cafe.accountStatus).toLowerCase() !== 'active') return 'Inactive';
  if (hasImportantIssue) return 'Warning';
  // A configured Kiosk is an online CafeKiosk service even when no tablet/browser
  // is currently connected. Live device presence remains available separately.
  if (cafe.connections.total === 0 && !cafe.kioskOnline) return 'Offline';
  return 'Online';
}


async function ensureDeletionLogTable(connection = dbPool) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS system_account_deletion_log (
      deletion_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cafe_id_snapshot VARCHAR(50) NOT NULL,
      cafe_name_snapshot VARCHAR(150) NOT NULL,
      owner_name_snapshot VARCHAR(150) NULL,
      owner_username_snapshot VARCHAR(100) NULL,
      owner_email_snapshot VARCHAR(190) NULL,
      deletion_reason VARCHAR(1000) NOT NULL,
      deleted_by VARCHAR(150) NOT NULL,
      deleted_from_ip VARCHAR(45) NULL,
      deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_system_account_deletion_time (deleted_at),
      KEY idx_system_account_deletion_cafe (cafe_id_snapshot)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function disconnectCafeSockets(io, cafeId) {
  if (!io) return;
  const rooms = [
    `admin-${cafeId}`,
    `pos-${cafeId}`,
    `order-queue-${cafeId}`,
    `kiosk-${cafeId}`,
    `auth-${cafeId}`,
    `role-admin-${cafeId}`,
    `role-staff-${cafeId}`,
    `role-manager-${cafeId}`
  ];
  const socketMap = new Map();
  for (const room of rooms) {
    const sockets = await io.in(room).fetchSockets();
    sockets.forEach((socket) => socketMap.set(socket.id, socket));
  }
  socketMap.forEach((socket) => socket.disconnect(true));
}

router.get('/overview', requireSystemAdminApi, async (req, res) => {
  const io = req.app.get('io');
  const generatedAt = new Date().toISOString();

  let databaseOk = true;
  let databaseInfo = null;
  let cafes = [];

  try {
    // Keep older Railway/local databases compatible with the current approval and kiosk schema.
    await ensurePanelistUpgrades();
    await kioskAccessStore.ensureSchema();
    await dbPool.query('SELECT 1');
    databaseInfo = { status: 'Online' };

    const [cafeRows] = await dbPool.query(`
      SELECT
        c.cafe_id,
        c.cafe_name,
        c.status,
        c.approval_status,
        c.approval_requested_at,
        c.approved_at,
        c.approved_by,
        c.rejection_reason,
        c.kiosk_slug,
        c.kiosk_enabled,
        c.kiosk_slug_updated_at,
        c.created_at,
        (
          SELECT u.full_name
            FROM users u
           WHERE u.cafe_id = c.cafe_id
             AND u.is_owner = 1
           ORDER BY u.user_id ASC
           LIMIT 1
        ) AS owner_name
      FROM cafes c
      ORDER BY c.cafe_name ASC
    `);

    const userActivityRows = await safeQuery(`
      SELECT cafe_id, MAX(COALESCE(last_activity, last_login, created_at)) AS last_activity
        FROM users
       GROUP BY cafe_id
    `);

    const auditActivityRows = await safeQuery(`
      SELECT cafe_id, MAX(created_at) AS last_activity
        FROM audit_logs
       GROUP BY cafe_id
    `);

    const orderActivityRows = await safeQuery(`
      SELECT cafe_id, MAX(created_at) AS last_activity
        FROM orders
       GROUP BY cafe_id
    `);

    const failedLoginRows = await safeQuery(`
      SELECT cafe_id, COUNT(*) AS total
        FROM login_logs
       WHERE login_status IN ('Failed', 'Locked')
         AND attempted_at >= (NOW() - INTERVAL 24 HOUR)
       GROUP BY cafe_id
    `);

    const delayedOrderRows = await safeQuery(`
      SELECT cafe_id, COUNT(*) AS total
        FROM orders
       WHERE status IN ('Pending', 'Preparing')
         AND created_at < (NOW() - INTERVAL 15 MINUTE)
       GROUP BY cafe_id
    `);

    const userActivity = mapRows(userActivityRows, 'cafe_id', 'last_activity');
    const auditActivity = mapRows(auditActivityRows, 'cafe_id', 'last_activity');
    const orderActivity = mapRows(orderActivityRows, 'cafe_id', 'last_activity');
    const failedLogins = mapRows(failedLoginRows, 'cafe_id', 'total');
    const delayedOrders = mapRows(delayedOrderRows, 'cafe_id', 'total');

    cafes = await Promise.all(cafeRows.map(async (row) => {
      const cafeId = String(row.cafe_id);
      const connections = await fetchSocketCounts(io, cafeId);

      const cafe = {
        cafeId,
        cafeName: row.cafe_name || cafeId,
        ownerName: row.owner_name || '—',
        accountStatus: row.status || 'Active',
        approvalStatus: row.approval_status || 'Approved',
        approvalRequestedAt: row.approval_requested_at || null,
        approvedAt: row.approved_at || null,
        approvedBy: row.approved_by || '',
        rejectionReason: row.rejection_reason || '',
        registeredAt: row.created_at || null,
        lastActivity: latestDate(
          userActivity.get(cafeId),
          auditActivity.get(cafeId),
          orderActivity.get(cafeId)
        ),
        failedLogins24h: Number(failedLogins.get(cafeId) || 0),
        delayedOrders: Number(delayedOrders.get(cafeId) || 0),
        kioskSlug: row.kiosk_slug || '',
        kioskEnabled: Boolean(row.kiosk_enabled),
        kioskOnline: String(row.status || 'Active').toLowerCase() === 'active' && String(row.approval_status || 'Approved').toLowerCase() === 'approved' && Boolean(row.kiosk_enabled) && Boolean(row.kiosk_slug),
        kioskConfiguredAt: row.kiosk_slug_updated_at || null,
        kioskDeviceOnline: Number(connections.kiosk || 0) > 0,
        connections
      };

      cafe.issues = buildIssueList(cafe);
      cafe.overallStatus = overallStatus(cafe);
      return cafe;
    }));
  } catch (error) {
    databaseOk = false;
    databaseInfo = { status: 'Offline' };
  }

  const securityAlertRows = await getRecentSecurityAlerts({ hours: 24, limit: 20 });
  const securityIssues = securityAlertRows.map((alert) => ({
    cafeId: alert.cafe_id || '',
    cafeName: alert.cafe_name || 'CafeKiosk Platform',
    severity: alert.severity || 'medium',
    message: `${alert.message}${alert.source_ip ? ` Source: ${alert.source_ip}` : ''}`,
    lastActivity: alert.created_at,
    type: 'security'
  }));

  const issueSeverityRank = { high: 3, medium: 2, info: 1 };
  let recentIssues = [...securityIssues, ...cafes
    .flatMap((cafe) => cafe.issues.map((issue) => ({
      cafeId: cafe.cafeId,
      cafeName: cafe.cafeName,
      severity: issue.severity,
      message: issue.message,
      lastActivity: cafe.lastActivity
    })))]
    .sort((a, b) => {
      const severityDiff = (issueSeverityRank[b.severity] || 0) - (issueSeverityRank[a.severity] || 0);
      if (severityDiff) return severityDiff;
      return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
    })
    .slice(0, 12);

  if (!databaseOk) {
    recentIssues = [{
      cafeId: '',
      cafeName: 'CafeKiosk Platform',
      severity: 'high',
      message: 'MySQL database connection is unavailable.',
      lastActivity: generatedAt
    }, ...recentIssues].slice(0, 12);
  }

  const onlineCafes = cafes.filter((cafe) => cafe.overallStatus === 'Online' || cafe.overallStatus === 'Warning').length;
  const needsAttention = cafes.filter((cafe) => cafe.overallStatus === 'Warning' || cafe.overallStatus === 'Offline' || cafe.overallStatus === 'Inactive').length;
  const activeConnections = cafes.reduce((sum, cafe) => sum + cafe.connections.total, 0);
  const pendingApprovals = cafes.filter((cafe) => String(cafe.approvalStatus || '').toLowerCase() === 'pending').length;

  return res.json({
    success: true,
    generatedAt,
    monitorMode: 'technical-monitor-with-account-control',
    system: {
      backend: 'Online',
      database: databaseOk ? 'Online' : 'Offline',
      websocket: io ? 'Online' : 'Unavailable',
      uptimeSeconds: Math.round(process.uptime()),
      activeConnections,
      databaseInfo
    },
    summary: {
      totalCafes: cafes.length,
      onlineCafes,
      needsAttention,
      pendingApprovals,
      activeConnections,
      securityAlerts24h: securityAlertRows.length
    },
    cafes,
    recentIssues
  });
});



// ============================================================
// NEW CAFE ACCOUNT APPROVAL
// Public owner registration stays Pending until the System Administrator
// reviews it. This prevents an unknown visitor from creating an immediately
// usable Admin account.
// ============================================================


router.post('/cafes/provision', requireSystemAdminApi, async (req, res) => {
  const cafeName = text(req.body?.cafeName);
  const ownerName = text(req.body?.ownerName || req.body?.fullName);
  const ownerEmail = text(req.body?.ownerEmail || req.body?.email).toLowerCase();
  const ownerPhone = text(req.body?.ownerPhone || req.body?.phone);
  const address = text(req.body?.address);
  const username = text(req.body?.username || req.body?.userId);
  const temporaryPassword = String(req.body?.temporaryPassword || req.body?.password || '');

  if (!cafeName || !ownerName || !ownerEmail || !username || !temporaryPassword) {
    return res.status(400).json({
      success: false,
      message: 'Cafe name, owner name, email, temporary User ID, and temporary password are required.'
    });
  }
  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid owner email address.' });
  }
  if (!/^[A-Za-z0-9._-]{3,60}$/.test(username)) {
    return res.status(400).json({
      success: false,
      message: 'Temporary User ID must be 3 to 60 characters and use only letters, numbers, dots, underscores, or hyphens.'
    });
  }
  if (temporaryPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Temporary password must be at least 8 characters.' });
  }

  const actor = req.systemAdmin?.displayName || req.systemAdmin?.username || 'System Administrator';
  const connection = await dbPool.getConnection().catch(() => null);
  if (!connection) {
    return res.status(503).json({ success: false, message: 'Database is unavailable.' });
  }

  try {
    await ensurePanelistUpgrades();
    await kioskAccessStore.ensureSchema();
    await connection.beginTransaction();

    const [emailRows] = await connection.execute(
      'SELECT user_id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',
      [ownerEmail]
    );
    if (emailRows.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'That owner email address already has a CafeKiosk account.' });
    }

    let cafeId = '';
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = makeCafeId(cafeName);
      const [rows] = await connection.execute('SELECT cafe_id FROM cafes WHERE cafe_id=? LIMIT 1', [candidate]);
      if (!rows.length) {
        cafeId = candidate;
        break;
      }
    }
    if (!cafeId) throw new Error('Could not generate a unique Cafe ID.');

    await connection.execute(
      `INSERT INTO cafes
       (cafe_id, cafe_name, address, contact_number, email, timezone, status,
        approval_status, approval_requested_at, approved_at, approved_by, rejection_reason)
       VALUES (?, ?, ?, ?, ?, 'Asia/Manila', 'Active', 'Approved', NOW(), NOW(), ?, NULL)`,
      [cafeId, cafeName, address || null, ownerPhone || null, ownerEmail, actor]
    );

    const kioskSlug = await kioskAccessStore.createUniqueSlug(cafeId, cafeName, connection);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const [ownerResult] = await connection.execute(
      `INSERT INTO users
       (cafe_id, full_name, username, email, phone, password_hash, role, is_owner,
        status, email_verified_at, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, 'Admin', 1, 'Active', NOW(), 1)`,
      [cafeId, ownerName, username, ownerEmail, ownerPhone || null, passwordHash]
    );

    await optionalExecute(
      connection,
      `INSERT INTO store_settings (cafe_id, store_name, address, contact_number, email)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE store_name=VALUES(store_name), address=VALUES(address),
         contact_number=VALUES(contact_number), email=VALUES(email)`,
      [cafeId, cafeName, address || null, ownerPhone || null, ownerEmail]
    );
    await optionalExecute(
      connection,
      `INSERT INTO tax_settings (cafe_id, tax_rate_percent, service_charge_percent)
       VALUES (?, 0, 0)
       ON DUPLICATE KEY UPDATE cafe_id=VALUES(cafe_id)`,
      [cafeId]
    );
    await optionalExecute(
      connection,
      `INSERT INTO system_preferences
       (cafe_id, default_order_type, low_stock_warning_default, currency_code, currency_symbol)
       VALUES (?, 'Dine In', 10, 'PHP', '₱')
       ON DUPLICATE KEY UPDATE cafe_id=VALUES(cafe_id)`,
      [cafeId]
    );

    const methods = [
      ['Cash', 'Cash', 1, 1],
      ['GCash', 'GCash / E-wallet', 0, 2],
      ['Card', 'Card', 0, 3],
      ['Other', 'Other', 0, 4]
    ];
    for (const method of methods) {
      await optionalExecute(
        connection,
        `INSERT INTO payment_methods (cafe_id, method_name, display_name, is_enabled, sort_order)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), sort_order=VALUES(sort_order)`,
        [cafeId, ...method]
      );
    }

    await optionalExecute(
      connection,
      `INSERT INTO cafe_approval_history
       (cafe_id, cafe_name_snapshot, owner_name_snapshot, owner_email_snapshot,
        old_status, new_status, reason, changed_by, changed_from_ip)
       VALUES (?, ?, ?, ?, 'Provisioned', 'Approved', ?, ?, ?)`,
      [
        cafeId,
        cafeName,
        ownerName,
        ownerEmail,
        'Cafe and owner account provisioned directly by the System Administrator for assisted onboarding.',
        actor,
        String(req.ip || req.socket?.remoteAddress || '').slice(0, 45) || null
      ]
    );

    await connection.commit();

    try {
      addAuditLog({
        cafeId,
        user: actor,
        userId: req.systemAdmin?.username || 'system-admin',
        role: 'SystemAdmin',
        action: 'Provision Cafe Owner',
        category: 'Users',
        details: `Provisioned cafe ${cafeName} and owner account ${ownerName} (${username}) for assisted onboarding.`,
        entityId: String(ownerResult.insertId),
        source: 'System Admin Onboarding',
        method: req.method,
        path: req.originalUrl,
        ip: req.ip || '',
        statusCode: 201,
        success: true
      });
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: `${cafeName} was created and approved. Use the temporary Owner credentials to complete Menu Management and Inventory setup, then hand the account to the cafe owner.`,
      cafeId,
      ownerUserId: ownerResult.insertId,
      ownerUsername: username,
      ownerEmail,
      kioskSlug,
      kioskUrl: kioskAccessStore.buildKioskUrl(kioskSlug),
      adminLoginUrl: '/admin-login',
      handoffRequired: true
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('System Admin provision cafe error:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'That User ID, owner email, or cafe identifier is already in use.' });
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to provision the cafe owner account.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

router.get('/approvals', requireSystemAdminApi, async (req, res) => {
  try {
    await ensurePanelistUpgrades();
    const [rows] = await dbPool.execute(`
      SELECT c.cafe_id AS cafeId,
             c.cafe_name AS cafeName,
             c.email AS cafeEmail,
             c.approval_status AS approvalStatus,
             c.approval_requested_at AS requestedAt,
             c.rejection_reason AS rejectionReason,
             c.created_at AS createdAt,
             u.user_id AS ownerUserId,
             u.full_name AS ownerName,
             u.email AS ownerEmail,
             u.phone AS ownerPhone,
             u.status AS ownerStatus
        FROM cafes c
        LEFT JOIN users u ON u.cafe_id = c.cafe_id AND u.is_owner = 1
       WHERE c.approval_status = 'Pending'
       ORDER BY COALESCE(c.approval_requested_at, c.created_at) ASC, u.user_id ASC
    `);
    return res.json({ success: true, count: rows.length, approvals: rows });
  } catch (error) {
    console.error('Load cafe approvals error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load pending cafe registrations.' });
  }
});

async function changeCafeApproval(req, res, nextStatus) {
  const cafeId = text(req.params.cafeId);
  const reason = text(req.body?.reason);
  const isApproved = nextStatus === 'Approved';
  if (!cafeId) return res.status(400).json({ success: false, message: 'Cafe account is required.' });
  if (!isApproved && reason.length < 5) {
    return res.status(400).json({ success: false, message: 'Please provide a short reason for rejecting this registration.' });
  }

  await ensurePanelistUpgrades();
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(`
      SELECT c.cafe_id, c.cafe_name, c.approval_status,
             u.user_id, u.full_name, u.email
        FROM cafes c
        LEFT JOIN users u ON u.cafe_id=c.cafe_id AND u.is_owner=1
       WHERE c.cafe_id=?
       ORDER BY u.user_id ASC
       LIMIT 1
       FOR UPDATE`, [cafeId]);

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Cafe registration was not found.' });
    }

    const cafe = rows[0];
    const oldStatus = cafe.approval_status || 'Approved';
    const actor = req.systemAdmin?.displayName || req.systemAdmin?.username || 'System Administrator';

    await connection.execute(`
      UPDATE cafes
         SET approval_status=?,
             status=?,
             approved_at=?,
             approved_by=?,
             rejection_reason=?
       WHERE cafe_id=?`, [
      nextStatus,
      isApproved ? 'Active' : 'Inactive',
      isApproved ? new Date() : null,
      isApproved ? actor : null,
      isApproved ? null : reason,
      cafeId
    ]);

    await connection.execute(
      `UPDATE users SET status=? WHERE cafe_id=? AND is_owner=1`,
      [isApproved ? 'Active' : 'Inactive', cafeId]
    );

    await connection.execute(`
      INSERT INTO cafe_approval_history
        (cafe_id, cafe_name_snapshot, owner_name_snapshot, owner_email_snapshot,
         old_status, new_status, reason, changed_by, changed_from_ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      cafeId,
      cafe.cafe_name,
      cafe.full_name || null,
      cafe.email || null,
      oldStatus,
      nextStatus,
      reason || null,
      actor,
      String(req.ip || req.socket?.remoteAddress || '').slice(0, 45) || null
    ]);

    await connection.commit();
    if (!isApproved) await disconnectCafeSockets(req.app.get('io'), cafeId);

    return res.json({
      success: true,
      cafeId,
      approvalStatus: nextStatus,
      emailNotification: null,
      message: isApproved
        ? `${cafe.cafe_name} was approved by the System Administrator. The cafe owner can now sign in.`
        : `${cafe.cafe_name} was rejected and cannot sign in.`
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Cafe approval update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update this cafe registration.' });
  } finally {
    connection.release();
  }
}

router.post('/approvals/:cafeId/approve', requireSystemAdminApi, (req, res) => changeCafeApproval(req, res, 'Approved'));
router.post('/approvals/:cafeId/reject', requireSystemAdminApi, (req, res) => changeCafeApproval(req, res, 'Rejected'));

router.get('/approval-history', requireSystemAdminApi, async (req, res) => {
  try {
    await ensurePanelistUpgrades();
    const [rows] = await dbPool.execute(`
      SELECT approval_history_id AS id, cafe_id AS cafeId, cafe_name_snapshot AS cafeName,
             owner_name_snapshot AS ownerName, owner_email_snapshot AS ownerEmail,
             old_status AS oldStatus, new_status AS newStatus, reason,
             changed_by AS changedBy, created_at AS changedAt
        FROM cafe_approval_history
       ORDER BY created_at DESC
       LIMIT 100`);
    return res.json({ success: true, history: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load approval history.' });
  }
});

router.delete('/cafes/:cafeId', requireSystemAdminApi, async (req, res) => {
  const cafeId = text(req.params.cafeId);
  const reason = text(req.body?.reason);

  if (!cafeId) {
    return res.status(400).json({ success: false, message: 'Cafe account is required.' });
  }
  if (reason.length < 8) {
    return res.status(400).json({ success: false, message: 'Please provide a clear deletion reason (at least 8 characters).' });
  }

  const connection = await dbPool.getConnection();
  try {
    await ensureDeletionLogTable(connection);
    await connection.beginTransaction();

    const [cafeRows] = await connection.execute(`
      SELECT c.cafe_id, c.cafe_name,
             u.full_name AS owner_name, u.username AS owner_username, u.email AS owner_email
        FROM cafes c
        LEFT JOIN users u ON u.cafe_id = c.cafe_id AND u.is_owner = 1
       WHERE c.cafe_id = ?
       ORDER BY u.user_id ASC
       LIMIT 1
    `, [cafeId]);

    if (!cafeRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Cafe account was not found.' });
    }

    const cafe = cafeRows[0];
    await connection.execute(`
      INSERT INTO system_account_deletion_log (
        cafe_id_snapshot, cafe_name_snapshot, owner_name_snapshot,
        owner_username_snapshot, owner_email_snapshot, deletion_reason,
        deleted_by, deleted_from_ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cafe.cafe_id,
      cafe.cafe_name,
      cafe.owner_name || null,
      cafe.owner_username || null,
      cafe.owner_email || null,
      reason,
      req.systemAdmin?.displayName || req.systemAdmin?.username || 'System Administrator',
      String(req.ip || req.socket?.remoteAddress || '').slice(0, 45) || null
    ]);

    // Delete restrictive/direct tenant records first. Cascading foreign keys remove their child rows.
    const deleteSteps = [
      ['inventory_movements', 'DELETE FROM inventory_movements WHERE cafe_id = ?'],
      ['purchase_orders', 'DELETE FROM purchase_orders WHERE cafe_id = ?'],
      ['orders', 'DELETE FROM orders WHERE cafe_id = ?'],
      ['products', 'DELETE FROM products WHERE cafe_id = ?'],
      ['ingredients', 'DELETE FROM ingredients WHERE cafe_id = ?'],
      ['categories', 'DELETE FROM categories WHERE cafe_id = ?'],
      ['promotions', 'DELETE FROM promotions WHERE cafe_id = ?'],
      ['suppliers', 'DELETE FROM suppliers WHERE cafe_id = ?'],
      ['registration_invites', 'DELETE FROM registration_invites WHERE cafe_id = ?'],
      ['account_status_history', 'DELETE FROM account_status_history WHERE cafe_id = ?'],
      ['login_logs', 'DELETE FROM login_logs WHERE cafe_id = ?'],
      ['notifications', 'DELETE FROM notifications WHERE cafe_id = ?'],
      ['audit_logs', 'DELETE FROM audit_logs WHERE cafe_id = ?'],
      ['store_settings', 'DELETE FROM store_settings WHERE cafe_id = ?'],
      ['payment_methods', 'DELETE FROM payment_methods WHERE cafe_id = ?'],
      ['tax_settings', 'DELETE FROM tax_settings WHERE cafe_id = ?'],
      ['system_preferences', 'DELETE FROM system_preferences WHERE cafe_id = ?'],
      ['app_state', 'DELETE FROM app_state WHERE cafe_id = ?'],
      ['users', 'DELETE FROM users WHERE cafe_id = ?']
    ];

    for (const [, sql] of deleteSteps) {
      try {
        await connection.execute(sql, [cafeId]);
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') continue;
        throw error;
      }
    }

    await connection.execute('DELETE FROM cafes WHERE cafe_id = ?', [cafeId]);
    await connection.commit();

    await disconnectCafeSockets(req.app.get('io'), cafeId);

    return res.json({
      success: true,
      message: `${cafe.cafe_name} and all associated cafe account data were permanently deleted. The deletion reason was preserved in the System Administrator deletion log.`
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    return res.status(500).json({
      success: false,
      message: 'Unable to completely delete the cafe account.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

router.get('/deletion-log', requireSystemAdminApi, async (req, res) => {
  try {
    await ensureDeletionLogTable();
    const [rows] = await dbPool.execute(`
      SELECT deletion_id, cafe_id_snapshot AS cafeId, cafe_name_snapshot AS cafeName,
             owner_name_snapshot AS ownerName, deletion_reason AS reason,
             deleted_by AS deletedBy, deleted_at AS deletedAt
        FROM system_account_deletion_log
       ORDER BY deleted_at DESC
       LIMIT 100
    `);
    return res.json({ success: true, deletions: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load deletion history.' });
  }
});

module.exports = router;
