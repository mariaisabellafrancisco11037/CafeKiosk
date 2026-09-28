const bcrypt = require('bcryptjs');
const dbPool = require('../config/dbPool');

let schemaReady = false;

async function ensureApprovalPinSchema() {
  if (schemaReady) return;
  try {
    const [columns] = await dbPool.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('approval_pin_hash','approval_pin_updated_at')`
    );
    const names = new Set(columns.map(row => String(row.COLUMN_NAME || '')));
    if (!names.has('approval_pin_hash')) {
      await dbPool.query('ALTER TABLE users ADD COLUMN approval_pin_hash VARCHAR(255) NULL');
    }
    if (!names.has('approval_pin_updated_at')) {
      await dbPool.query('ALTER TABLE users ADD COLUMN approval_pin_updated_at DATETIME NULL');
    }
    schemaReady = true;
  } catch (error) {
    // A concurrent request may have added the column first. Re-check once.
    if (error?.code === 'ER_DUP_FIELDNAME') {
      schemaReady = true;
      return;
    }
    throw error;
  }
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
