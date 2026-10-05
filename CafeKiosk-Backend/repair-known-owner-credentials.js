'use strict';

// One-time compatibility repair for the TeaSquared owner account supplied by
// the project owner. The migration marker prevents future deployments from
// resetting the password again after the owner changes it.
const bcrypt = require('bcryptjs');
const pool = require('./config/dbPool');

const PATCH_ID = '20261005-teasquared-admin-temp-credential-v1';

module.exports = async function repairKnownOwnerCredentials() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        migration_key VARCHAR(190) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const [done] = await connection.execute(
      'SELECT migration_key FROM app_migrations WHERE migration_key=? LIMIT 1', [PATCH_ID]
    );
    if (done.length) {
      await connection.rollback();
      return { skipped: true, reason: 'already-applied' };
    }

    const [rows] = await connection.execute(
      `SELECT u.user_id, u.cafe_id
         FROM users u
        WHERE LOWER(TRIM(u.username))=LOWER(?)
        LIMIT 1`,
      ['Tea_Squared']
    );

    if (!rows.length) {
      // Do not mark it applied: if the existing Railway database is restored
      // later, the repair can still run once.
      await connection.rollback();
      return { skipped: true, reason: 'Tea_Squared-not-found' };
    }

    const passwordHash = await bcrypt.hash('TSquared', 12);
    await connection.execute(
      `UPDATE users
          SET username='Tea_Squared', password_hash=?, role='Admin', is_owner=1,
              status='Active', failed_attempts=0, lock_until=NULL,
              must_change_password=1, updated_at=NOW()
        WHERE user_id=?`,
      [passwordHash, rows[0].user_id]
    );
    await connection.execute(
      `UPDATE cafes
          SET status='Active', approval_status='Approved', rejection_reason=NULL
        WHERE cafe_id=?`,
      [rows[0].cafe_id]
    );
    await connection.execute(
      'INSERT INTO app_migrations (migration_key) VALUES (?)', [PATCH_ID]
    );
    await connection.commit();
    return { repaired: true, cafeId: rows[0].cafe_id, userId: rows[0].user_id };
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    throw error;
  } finally {
    connection.release();
  }
};
