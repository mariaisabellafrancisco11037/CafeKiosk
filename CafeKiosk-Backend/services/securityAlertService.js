const dbPool = require('../config/dbPool');

let schemaReady = false;
let schemaPromise = null;

function safeText(value) {
  return String(value ?? '').trim();
}

function normalizeSeverity(value) {
  const severity = safeText(value).toLowerCase();
  if (severity === 'high' || severity === 'medium' || severity === 'info') return severity;
  return 'medium';
}

function clientIp(req) {
  const forwarded = safeText(req?.headers?.['x-forwarded-for']).split(',')[0].trim();
  return forwarded || safeText(req?.ip) || safeText(req?.socket?.remoteAddress) || null;
}

async function ensureSecurityAlertTable(connection = dbPool) {
  if (schemaReady) return;
  if (!schemaPromise) {
    schemaPromise = connection.execute(`
      CREATE TABLE IF NOT EXISTS security_alerts (
        alert_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cafe_id VARCHAR(50) NULL,
        alert_type VARCHAR(80) NOT NULL,
        severity ENUM('info','medium','high') NOT NULL DEFAULT 'medium',
        message VARCHAR(600) NOT NULL,
        source_ip VARCHAR(64) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME NULL,
        KEY idx_security_alert_created (created_at),
        KEY idx_security_alert_cafe (cafe_id, created_at),
        KEY idx_security_alert_type (alert_type, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(() => {
      schemaReady = true;
    }).finally(() => {
      schemaPromise = null;
    });
  }
  return schemaPromise;
}

async function createSecurityAlert({ cafeId = null, alertType, severity = 'medium', message, sourceIp = null, dedupeMinutes = 3 } = {}) {
  const type = safeText(alertType) || 'SECURITY_EVENT';
  const level = normalizeSeverity(severity);
  const detail = safeText(message).slice(0, 600) || 'Security event detected.';
  const ip = safeText(sourceIp).slice(0, 64) || null;
  const cafe = safeText(cafeId).slice(0, 50) || null;

  try {
    await ensureSecurityAlertTable();

    // Avoid flooding the IT dashboard if the same source keeps retrying while
    // an account is already locked. A later attempt can still create a fresh
    // alert after the short dedupe window expires.
    if (Number(dedupeMinutes) > 0) {
      const [existing] = await dbPool.execute(
        `SELECT alert_id
           FROM security_alerts
          WHERE alert_type = ?
            AND COALESCE(cafe_id, '') = COALESCE(?, '')
            AND COALESCE(source_ip, '') = COALESCE(?, '')
            AND created_at >= (NOW() - INTERVAL ${Math.min(60, Math.max(1, Number(dedupeMinutes) || 3))} MINUTE)
          ORDER BY alert_id DESC
          LIMIT 1`,
        [type, cafe, ip]
      );
      if (existing.length) return { created: false, duplicate: true, alertId: existing[0].alert_id };
    }

    const [result] = await dbPool.execute(
      `INSERT INTO security_alerts (cafe_id, alert_type, severity, message, source_ip, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [cafe, type, level, detail, ip]
    );
    return { created: true, alertId: result.insertId };
  } catch (error) {
    // A security alert must never make authentication itself unavailable.
    console.warn('Unable to record security alert:', error.message);
    return { created: false, error: error.message };
  }
}

async function getRecentSecurityAlerts({ hours = 24, limit = 20 } = {}) {
  const safeHours = Math.min(168, Math.max(1, Number(hours) || 24));
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  try {
    await ensureSecurityAlertTable();
    const [rows] = await dbPool.query(`
      SELECT sa.alert_id,
             sa.cafe_id,
             sa.alert_type,
             sa.severity,
             sa.message,
             sa.source_ip,
             sa.created_at,
             c.cafe_name
        FROM security_alerts sa
        LEFT JOIN cafes c ON c.cafe_id = sa.cafe_id
       WHERE sa.created_at >= (NOW() - INTERVAL ${safeHours} HOUR)
       ORDER BY sa.created_at DESC, sa.alert_id DESC
       LIMIT ${safeLimit}
    `);
    return rows;
  } catch (error) {
    console.warn('Unable to load security alerts:', error.message);
    return [];
  }
}

module.exports = {
  ensureSecurityAlertTable,
  createSecurityAlert,
  getRecentSecurityAlerts,
  clientIp
};
