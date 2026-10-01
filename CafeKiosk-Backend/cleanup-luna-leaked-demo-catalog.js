// One-time repair for the Luna Coffee account that received the bundled cafe-1
// demo catalog in an earlier build. This never touches cafe-1 and never runs
// twice for the same cafe. Future tenant isolation is enforced separately by
// authenticated catalog APIs and the frontend tenant fix.
const pool = require('./config/dbPool');

async function cleanupLunaLeakedDemoCatalog() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`CREATE TABLE IF NOT EXISTS maintenance_markers (
      marker_key VARCHAR(190) PRIMARY KEY,
      completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const [cafes] = await conn.execute(
      `SELECT cafe_id, cafe_name FROM cafes
       WHERE LOWER(TRIM(cafe_name))='luna coffee' AND cafe_id <> 'cafe-1'`
    );

    for (const cafe of cafes) {
      const marker = `cleanup:luna-demo-catalog:${cafe.cafe_id}:v1`;
      const [done] = await conn.execute(
        'SELECT marker_key FROM maintenance_markers WHERE marker_key=? LIMIT 1',
        [marker]
      );
      if (done.length) continue;

      await conn.beginTransaction();
      try {
        // Deactivate rather than hard-delete so existing FK/audit history stays valid.
        await conn.execute('UPDATE products SET is_active=0 WHERE cafe_id=?', [cafe.cafe_id]);
        await conn.execute("UPDATE categories SET status='Inactive' WHERE cafe_id=?", [cafe.cafe_id]);
        await conn.execute('INSERT INTO maintenance_markers (marker_key) VALUES (?)', [marker]);
        await conn.commit();
        console.log(`[tenant repair] Cleared leaked demo catalog from ${cafe.cafe_name} (${cafe.cafe_id}).`);
      } catch (error) {
        await conn.rollback();
        throw error;
      }
    }
  } finally {
    conn.release();
  }
}

module.exports = cleanupLunaLeakedDemoCatalog;
