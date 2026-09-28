const bcrypt = require('bcryptjs');
const dbPool = require('../config/dbPool');

let schemaReady = false;
let schemaPromise = null;

async function prepareSchema() {
  const connection = await dbPool.getConnection();
  try {
    const [tables] = await connection.execute(
      `SELECT 1 FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' LIMIT 1`
    );
    if (!tables.length) {
      const error = new Error('The users table is missing. Import the CafeKiosk database schema first.');
      error.code = 'CAFEKIOSK_SCHEMA_MISSING';
      throw error;
    }

    const requiredColumns = [
      ['approval_pin_hash', 'VARCHAR(255) NULL'],
      ['approval_pin_updated_at', 'DATETIME NULL']
    ];

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('approval_pin_hash','approval_pin_updated_at')`
    );
    const names = new Set(columns.map(row => String(row.COLUMN_NAME || '')));

    for (const [columnName, definition] of requiredColumns) {
      if (names.has(columnName)) continue;
      try {
        await connection.query(`ALTER TABLE users ADD COLUMN \`${columnName}\` ${definition}`);
      } catch (error) {
        if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
      }
    }

    const [verified] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('approval_pin_hash','approval_pin_updated_at')`
    );
    const verifiedNames = new Set(verified.map(row => String(row.COLUMN_NAME || '')));
    if (!requiredColumns.every(([columnName]) => verifiedNames.has(columnName))) {
      const error = new Error('Approval PIN database columns could not be prepared.');
      error.code = 'APPROVAL_PIN_SCHEMA_INCOMPLETE';
      throw error;
    }

    schemaReady = true;
  } finally {
    connection.release();
  }
}

async function ensureApprovalPinSchema() {
  if (schemaReady) return;
  if (!schemaPromise) {
    schemaPromise = prepareSchema().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

function normalizePin(value) {
  return String(value ?? '').trim();
}

function validPin(value) {
  return /^\d{4,6}$/.test(normalizePin(value));
}

async function getUserApprovalPinStatus(cafeId, userId) {
  await ensureApprovalPinSchema();
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return { found: false, hasPin: false, updatedAt: null };
  }

  const [rows] = await dbPool.execute(
    `SELECT user_id, full_name, username, role, status,
            approval_pin_hash IS NOT NULL AND approval_pin_hash <> '' AS has_pin,
            approval_pin_updated_at
       FROM users
      WHERE cafe_id = ? AND user_id = ?
      LIMIT 1`,
    [String(cafeId || ''), numericUserId]
  );

  if (!rows.length) return { found: false, hasPin: false, updatedAt: null };
  const row = rows[0];
  return {
    found: true,
    userId: Number(row.user_id),
    name: row.full_name || row.username || row.role,
    username: row.username || '',
    role: row.role,
    status: row.status,
    hasPin: Boolean(row.has_pin),
    updatedAt: row.approval_pin_updated_at || null
  };
}

async function verifyUserApprovalPin(cafeId, userId, pinValue) {
  const pin = normalizePin(pinValue);
  if (!validPin(pin)) {
    return { valid: false, code: 'APPROVAL_PIN_REQUIRED', message: 'Enter a valid 4-6 digit PIN.' };
  }

  await ensureApprovalPinSchema();
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return {
      valid: false,
      code: 'APPROVAL_PIN_ACCOUNT_REQUIRED',
      message: 'A database-backed Admin or Manager account is required.'
    };
  }

  const [rows] = await dbPool.execute(
    `SELECT user_id, full_name, username, role, status, approval_pin_hash
       FROM users
      WHERE cafe_id = ?
        AND user_id = ?
        AND role IN ('Admin','Manager')
      LIMIT 1`,
    [String(cafeId || ''), numericUserId]
  );

  if (!rows.length || String(rows[0].status || '').toLowerCase() !== 'active') {
    return {
      valid: false,
      code: 'APPROVAL_PIN_ACCOUNT_NOT_ACTIVE',
      message: 'The Admin/Manager account is not active.'
    };
  }

  const row = rows[0];
  if (!row.approval_pin_hash) {
    return {
      valid: false,
      code: 'APPROVAL_PIN_NOT_CONFIGURED',
      message: 'No approval PIN is set for this account yet.'
    };
  }

  if (!(await bcrypt.compare(pin, String(row.approval_pin_hash)))) {
    return {
      valid: false,
      code: 'APPROVAL_PIN_INVALID',
      message: 'That is not the PIN saved for this account.'
    };
  }

  return {
    valid: true,
    approver: {
      userId: Number(row.user_id),
      name: row.full_name || row.username || row.role,
      username: row.username || '',
      role: row.role
    }
  };
}

async function verifyCafeApprovalPin(cafeId, pinValue) {
  const pin = normalizePin(pinValue);
  if (!validPin(pin)) {
    return {
      valid: false,
      code: 'APPROVAL_PIN_REQUIRED',
      message: 'Enter a valid 4-6 digit Admin/Manager PIN.'
    };
  }

  await ensureApprovalPinSchema();

  const [rows] = await dbPool.execute(
    `SELECT user_id, full_name, username, role, approval_pin_hash
       FROM users
      WHERE cafe_id = ?
        AND role IN ('Admin','Manager')
        AND status = 'Active'
        AND approval_pin_hash IS NOT NULL
        AND approval_pin_hash <> ''`,
    [String(cafeId || '')]
  );

  if (!rows.length) {
    return {
      valid: false,
      code: 'APPROVAL_PIN_NOT_CONFIGURED',
      message: 'No approval PIN is configured for this cafe. An Admin or Manager must set one from their Profile menu.'
    };
  }

  for (const row of rows) {
    if (await bcrypt.compare(pin, String(row.approval_pin_hash || ''))) {
      return {
        valid: true,
        approver: {
          userId: Number(row.user_id),
          name: row.full_name || row.username || row.role,
          username: row.username || '',
          role: row.role
        }
      };
    }
  }

  return {
    valid: false,
    code: 'APPROVAL_PIN_INVALID',
    message: 'Invalid Admin/Manager approval PIN.'
  };
}

module.exports = {
  ensureApprovalPinSchema,
  normalizePin,
  validPin,
  getUserApprovalPinStatus,
  verifyUserApprovalPin,
  verifyCafeApprovalPin
};
