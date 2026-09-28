const bcrypt = require('bcryptjs');
const dbPool = require('../config/dbPool');

let schemaReady = false;

async function ensureApprovalPinSchema() {
  if (schemaReady) return;

  const requiredColumns = [
    ['approval_pin_hash', 'VARCHAR(255) NULL'],
    ['approval_pin_updated_at', 'DATETIME NULL']
  ];

  const [tables] = await dbPool.execute(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' LIMIT 1`
  );
  if (!tables.length) {
    const error = new Error('The users table is missing. Import the CafeKiosk database schema first.');
    error.code = 'CAFEKIOSK_SCHEMA_MISSING';
    throw error;
  }

  const [columns] = await dbPool.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
       AND COLUMN_NAME IN ('approval_pin_hash','approval_pin_updated_at')`
  );
  const names = new Set(columns.map(row => String(row.COLUMN_NAME || '')));

  for (const [columnName, definition] of requiredColumns) {
    if (names.has(columnName)) continue;
    try {
      await dbPool.query(`ALTER TABLE users ADD COLUMN \`${columnName}\` ${definition}`);
      names.add(columnName);
    } catch (error) {
      // Another request/deploy may have added the same field between our
      // information_schema check and ALTER TABLE. Only ignore that race.
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
      names.add(columnName);
    }
  }

  const [verified] = await dbPool.execute(
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
}


function normalizePin(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

async function verifyCafeApprovalPin(cafeId, pinValue) {
  const pin = normalizePin(pinValue);
  if (!/^\d{4,6}$/.test(pin)) {
    return { valid: false, code: 'APPROVAL_PIN_REQUIRED', message: 'Enter a valid 4-6 digit Admin/Manager PIN.' };
  }

  await ensureApprovalPinSchema();

  const [rows] = await dbPool.execute(
    `SELECT user_id, full_name, username, role, approval_pin_hash
       FROM users
      WHERE cafe_id = ?
        AND role IN ('Admin','Manager')
        AND status = 'Active'
        AND approval_pin_hash IS NOT NULL`,
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

  return { valid: false, code: 'APPROVAL_PIN_INVALID', message: 'Invalid Admin/Manager approval PIN.' };
}

module.exports = {
  ensureApprovalPinSchema,
  normalizePin,
  verifyCafeApprovalPin
};
