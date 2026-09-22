const pool = require('../config/dbPool');

async function ensureTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_state (
      cafe_id VARCHAR(50) NOT NULL,
      state_key VARCHAR(100) NOT NULL,
      payload JSON NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (cafe_id, state_key),
      CONSTRAINT fk_app_state_cafe FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}

async function getState(cafeId='cafe-1', key, fallback=null) {
  await ensureTable();
  const [rows] = await pool.execute(
    'SELECT payload FROM app_state WHERE cafe_id=? AND state_key=? LIMIT 1',
    [String(cafeId || 'cafe-1'), String(key)]
  );
  if (!rows.length) return fallback;
  let value = rows[0].payload;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (_) {}
  }
  return value ?? fallback;
}

async function setState(cafeId='cafe-1', key, payload) {
  await ensureTable();
  await pool.execute(
    `INSERT INTO app_state (cafe_id, state_key, payload)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE payload=VALUES(payload), updated_at=CURRENT_TIMESTAMP`,
    [String(cafeId || 'cafe-1'), String(key), JSON.stringify(payload ?? null)]
  );
  return payload;
}

module.exports = { ensureTable, getState, setState };
