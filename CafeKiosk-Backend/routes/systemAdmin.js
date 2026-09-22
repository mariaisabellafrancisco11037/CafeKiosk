const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const dbPool = require('../config/dbPool');
const kioskAccessStore = require('../services/kioskAccessStore');
const {
  SYSTEM_ADMIN_COOKIE,
  requireSystemAdminApi
} = require('../middleware/systemAdminMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cafekiosk-demo-secret';

function text(value) {
  return String(value ?? '').trim();
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
    sameSite: 'lax',
    secure: Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https'),
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
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

router.post('/login', (req, res) => {
  const expectedUser = process.env.SYSTEM_ADMIN_USER || 'systemadmin';
  const expectedPassword = process.env.SYSTEM_ADMIN_PASSWORD || 'CafeMonitor_2026!';
  const username = text(req.body?.username);
  const password = String(req.body?.password || '');

  if (!safeEqual(username.toLowerCase(), expectedUser.toLowerCase()) || !safeEqual(password, expectedPassword)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid System Administrator credentials.'
    });
  }

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
    // Ensure older databases have the Kiosk access columns before the monitor reads them.
    await kioskAccessStore.ensureSchema();
    const [dbRows] = await dbPool.query('SELECT DATABASE() AS databaseName, VERSION() AS version, NOW() AS serverTime');
    databaseInfo = dbRows[0] || null;

    const [cafeRows] = await dbPool.query(`
      SELECT
        c.cafe_id,
        c.cafe_name,
        c.status,
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
        ) AS owner_name,
        (
          SELECT u.username
            FROM users u
           WHERE u.cafe_id = c.cafe_id
             AND u.is_owner = 1
           ORDER BY u.user_id ASC
           LIMIT 1
        ) AS owner_username
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
        ownerUsername: row.owner_username || '',
        accountStatus: row.status || 'Active',
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
        kioskOnline: String(row.status || 'Active').toLowerCase() === 'active' && Boolean(row.kiosk_enabled) && Boolean(row.kiosk_slug),
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
    databaseInfo = {
      databaseName: process.env.DB_NAME || 'cafekiosk',
      code: error.code || 'DB_ERROR',
      message: error.message
    };
  }

  const issueSeverityRank = { high: 3, medium: 2, info: 1 };
  let recentIssues = cafes
    .flatMap((cafe) => cafe.issues.map((issue) => ({
      cafeId: cafe.cafeId,
      cafeName: cafe.cafeName,
      severity: issue.severity,
      message: issue.message,
      lastActivity: cafe.lastActivity
    })))
    .sort((a, b) => (issueSeverityRank[b.severity] || 0) - (issueSeverityRank[a.severity] || 0))
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
      activeConnections
    },
    cafes,
    recentIssues
  });
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
             owner_name_snapshot AS ownerName, owner_username_snapshot AS ownerUsername,
             owner_email_snapshot AS ownerEmail, deletion_reason AS reason,
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
