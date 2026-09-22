const bcrypt = require('bcryptjs');
const pool = require('./config/dbPool');

async function tableExists(name) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c
       FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?`,
    [name]
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function ensureCurrentUserColumns() {
  // These ALTERs are safe on current MariaDB/MySQL used by the project.
  // If a column already exists, the duplicate-column error is ignored.
  const alters = [
    `ALTER TABLE users ADD COLUMN email VARCHAR(190) NULL AFTER username`,
    `ALTER TABLE users ADD COLUMN phone VARCHAR(40) NULL AFTER email`,
    `ALTER TABLE users ADD COLUMN is_owner TINYINT(1) NOT NULL DEFAULT 0 AFTER role`,
    `ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL AFTER status`,
    `ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER email_verified_at`,
    `ALTER TABLE users ADD COLUMN failed_attempts INT UNSIGNED NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN lock_until DATETIME NULL`,
    `ALTER TABLE users ADD COLUMN last_login DATETIME NULL`,
    `ALTER TABLE users ADD COLUMN last_activity DATETIME NULL`,
    `ALTER TABLE users ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  ];

  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (error) {
      // ER_DUP_FIELDNAME = column already exists. Anything else should stop.
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  // Keep emails unique when possible, but don't fail if an older install already
  // has a conflicting or equivalent index.
  try {
    await pool.query(`ALTER TABLE users ADD UNIQUE KEY uq_users_email (email)`);
  } catch (error) {
    if (!['ER_DUP_KEYNAME', 'ER_DUP_ENTRY'].includes(error.code)) throw error;
  }
}

async function upsertUser(connection, account) {
  const [existing] = await connection.execute(
    `SELECT user_id FROM users WHERE cafe_id=? AND LOWER(username)=LOWER(?) LIMIT 1`,
    [account.cafeId, account.username]
  );

  const hash = await bcrypt.hash(account.password, 10);

  if (existing.length) {
    await connection.execute(
      `UPDATE users
          SET full_name=?, email=?, phone=NULL, password_hash=?, role=?, is_owner=?,
              status='Active', email_verified_at=NOW(), failed_attempts=0,
              lock_until=NULL, must_change_password=0, updated_at=NOW()
        WHERE user_id=?`,
      [account.fullName, account.email, hash, account.role, account.isOwner ? 1 : 0, existing[0].user_id]
    );
    return existing[0].user_id;
  }

  const [result] = await connection.execute(
    `INSERT INTO users
      (cafe_id, full_name, username, email, phone, password_hash, role, is_owner,
       status, email_verified_at, must_change_password, failed_attempts, lock_until)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 'Active', NOW(), 0, 0, NULL)`,
    [account.cafeId, account.fullName, account.username, account.email, hash, account.role, account.isOwner ? 1 : 0]
  );
  return result.insertId;
}

async function main() {
  let connection;
  try {
    if (!(await tableExists('cafes')) || !(await tableExists('users'))) {
      throw new Error(
        'CafeKiosk database tables were not found. Import CafeKiosk-DataBase/schema.sql first, then run this script again.'
      );
    }

    await ensureCurrentUserColumns();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO cafes (cafe_id, cafe_name, timezone, status)
       VALUES ('cafe-1', 'CafeKiosk Demo Cafe', 'Asia/Manila', 'Active')
       ON DUPLICATE KEY UPDATE cafe_name=VALUES(cafe_name), status='Active'`
    );

    const accounts = [
      {
        cafeId: 'cafe-1',
        fullName: 'CafeKiosk Administrator',
        username: 'admin',
        email: 'admin@cafekiosk.local',
        password: 'admin123',
        role: 'Admin',
        isOwner: true
      },
      {
        cafeId: 'cafe-1',
        fullName: 'CafeKiosk Staff',
        username: 'staff',
        email: 'staff@cafekiosk.local',
        password: 'staff123',
        role: 'Staff',
        isOwner: false
      }
    ];

    const ids = [];
    for (const account of accounts) {
      ids.push(await upsertUser(connection, account));
    }

    // Clear any previous DB sessions for these test accounts so the test starts clean.
    if (await tableExists('user_sessions')) {
      const placeholders = ids.map(() => '?').join(',');
      await connection.query(`DELETE FROM user_sessions WHERE user_id IN (${placeholders})`, ids);
    }

    await connection.commit();

    console.log('');
    console.log('======================================================');
    console.log(' CafeKiosk sample accounts are ready');
    console.log('======================================================');
    console.log(' Cafe ID:  cafe-1');
    console.log('');
    console.log(' ADMIN / OWNER');
    console.log(' Username: admin');
    console.log(' Password: admin123');
    console.log('');
    console.log(' STAFF');
    console.log(' Username: staff');
    console.log(' Password: staff123');
    console.log('======================================================');
    console.log(' Existing admin/staff sample rows were updated and reactivated.');
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error('');
    console.error('Could not add the sample accounts:');
    console.error(error.message || error);
    console.error('');
    console.error('Make sure MySQL Server is running and the cafekiosk schema exists. Run CONFIGURE_MYSQL_CONNECTION.bat if needed.');
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

main();
