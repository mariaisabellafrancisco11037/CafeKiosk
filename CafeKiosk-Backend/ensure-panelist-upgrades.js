'use strict';

const pool = require('./config/dbPool');

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function addColumn(connection, tableName, columnName, definition) {
  if (await columnExists(connection, tableName, columnName)) return false;
  await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  return true;
}

async function ensurePanelistUpgrades() {
  const connection = await pool.getConnection();
  try {
    if (!(await tableExists(connection, 'cafes')) || !(await tableExists(connection, 'users'))) {
      return { skipped: true, reason: 'base-schema-not-ready' };
    }

    const added = [];
    if (await addColumn(connection, 'cafes', 'approval_status', "ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Approved' AFTER status")) added.push('cafes.approval_status');
    if (await addColumn(connection, 'cafes', 'approval_requested_at', 'DATETIME NULL AFTER approval_status')) added.push('cafes.approval_requested_at');
    if (await addColumn(connection, 'cafes', 'approved_at', 'DATETIME NULL AFTER approval_requested_at')) added.push('cafes.approved_at');
    if (await addColumn(connection, 'cafes', 'approved_by', 'VARCHAR(150) NULL AFTER approved_at')) added.push('cafes.approved_by');
    if (await addColumn(connection, 'cafes', 'rejection_reason', 'VARCHAR(1000) NULL AFTER approved_by')) added.push('cafes.rejection_reason');

    if (await tableExists(connection, 'orders')) {
      if (await addColumn(connection, 'orders', 'payment_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER payment_status')) added.push('orders.payment_amount');
      await connection.execute(`
        UPDATE orders
           SET payment_amount = CASE
             WHEN payment_method = 'Cash' THEN cash_received
             WHEN payment_method IN ('GCash','Card','Other') THEN total_amount
             ELSE payment_amount
           END
         WHERE payment_amount = 0
           AND (cash_received > 0 OR total_amount > 0)
      `);
    }

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Existing installations predate approval. Preserve them as approved.
    await connection.execute(`
      UPDATE cafes
         SET approval_status = 'Approved',
             approved_at = COALESCE(approved_at, created_at),
             approved_by = COALESCE(approved_by, 'Existing Cafe Migration')
       WHERE approval_status IS NULL OR approval_status = ''
    `);

    // The bundled presentation tenant is always immediately usable.
    await connection.execute(`
      UPDATE cafes
         SET status = 'Active',
             approval_status = 'Approved',
             approved_at = COALESCE(approved_at, NOW()),
             approved_by = COALESCE(approved_by, 'CafeKiosk Demo Seed'),
             rejection_reason = NULL
       WHERE cafe_id = 'cafe-1'
    `);
    await connection.execute(`UPDATE users SET status='Active' WHERE cafe_id='cafe-1' AND status='Pending'`);

    return { upgraded: true, added };
  } finally {
    connection.release();
  }
}

module.exports = ensurePanelistUpgrades;

if (require.main === module) {
  ensurePanelistUpgrades()
    .then(result => console.log('Panelist upgrade schema:', result))
    .catch(error => {
      console.error('Panelist upgrade schema failed:', error);
      process.exitCode = 1;
    });
}
