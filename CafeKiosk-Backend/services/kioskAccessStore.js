const pool = require('../config/dbPool');
const os = require('os');
const { railwayUrl } = require('./publicUrlService');

const RESERVED = new Set([
  'admin','api','assets','auth','checkout','dashboard','kiosk','login','manager','menu',
  'order','orders','pos','settings','signup','staff','system-admin','system-monitor'
]);

let schemaReady = false;

function safeText(value) {
  return String(value ?? '').trim();
}

function slugify(value) {
  return safeText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40)
    .replace(/-+$/g, '') || 'my-cafe';
}

function validateSlug(value) {
  const slug = safeText(value).toLowerCase();
  if (slug.length < 3 || slug.length > 40) {
    return { valid: false, message: 'Kiosk link name must be 3 to 40 characters.' };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { valid: false, message: 'Use lowercase letters, numbers, and single hyphens only.' };
  }
  if (RESERVED.has(slug)) {
    return { valid: false, message: 'That kiosk link name is reserved. Please choose another.' };
  }
  return { valid: true, slug };
}

function isPrivateIpv4(address) {
  const value = safeText(address);
  if (/^10\./.test(value)) return true;
  if (/^192\.168\./.test(value)) return true;
  const match = value.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function getPreferredLanIpv4() {
  const candidates = [];
  const interfaces = os.networkInterfaces();

  for (const [name, entries] of Object.entries(interfaces)) {
    const adapter = String(name || '');
    if (/virtual|vmware|virtualbox|vethernet|wsl|docker|loopback|bluetooth/i.test(adapter)) continue;

    for (const entry of entries || []) {
      const family = typeof entry.family === 'string' ? entry.family : String(entry.family);
      const address = safeText(entry.address);
      if ((family !== 'IPv4' && family !== '4') || entry.internal || !address) continue;
      if (address.startsWith('127.') || address.startsWith('169.254.')) continue;

      let score = 0;
      if (/wi-?fi|wireless|wlan/i.test(adapter)) score += 50;
      if (/ethernet|lan/i.test(adapter)) score += 40;
      if (isPrivateIpv4(address)) score += 20;
      if (/^192\.168\./.test(address)) score += 5;
      candidates.push({ address, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.address.localeCompare(b.address));
  return candidates[0]?.address || '';
}

function configuredBaseUrl() {
  const deployed = railwayUrl();
  if (deployed) return deployed;

  const configured = safeText(process.env.KIOSK_BASE_URL).replace(/\/+$/, '');
  if (!configured) return '';

  // A localhost value is convenient on the laptop but cannot be opened from a tablet.
  // Treat it as a development fallback and prefer the detected LAN address when one exists.
  try {
    const parsed = new URL(configured);
    if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname.toLowerCase())) {
      return configured;
    }
  } catch (_) {
    return configured;
  }
  return '';
}

function baseUrl() {
  const configured = configuredBaseUrl();
  if (configured) return configured;

  const lanIp = getPreferredLanIpv4();
  const port = safeText(process.env.PORT || '5000') || '5000';
  if (lanIp) return `http://${lanIp}:${port}`;

  return `http://localhost:${port}`;
}

function buildKioskUrl(slug) {
  return `${baseUrl()}/kiosk/${encodeURIComponent(slug)}`;
}

async function columnExists(db, tableName, columnName) {
  const [rows] = await db.execute(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function indexExists(db, tableName, indexName) {
  const [rows] = await db.execute(
    `SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function ensureSchema(db = pool) {
  if (schemaReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS cafes (
      cafe_id VARCHAR(50) PRIMARY KEY,
      cafe_name VARCHAR(150) NOT NULL,
      address VARCHAR(255) NULL,
      contact_number VARCHAR(50) NULL,
      email VARCHAR(190) NULL,
      kiosk_slug VARCHAR(80) NULL,
      kiosk_enabled TINYINT(1) NOT NULL DEFAULT 1,
      kiosk_slug_updated_at DATETIME NULL,
      opening_time TIME NULL,
      closing_time TIME NULL,
      timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Manila',
      status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cafes_kiosk_slug (kiosk_slug)
    ) ENGINE=InnoDB
  `);

  if (!(await columnExists(db, 'cafes', 'kiosk_slug'))) {
    await db.query(`ALTER TABLE cafes ADD COLUMN kiosk_slug VARCHAR(80) NULL AFTER email`);
  }
  if (!(await columnExists(db, 'cafes', 'kiosk_enabled'))) {
    await db.query(`ALTER TABLE cafes ADD COLUMN kiosk_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER kiosk_slug`);
  }
  if (!(await columnExists(db, 'cafes', 'kiosk_slug_updated_at'))) {
    await db.query(`ALTER TABLE cafes ADD COLUMN kiosk_slug_updated_at DATETIME NULL AFTER kiosk_enabled`);
  }

  if (!(await indexExists(db, 'cafes', 'uq_cafes_kiosk_slug'))) {
    try {
      await db.query(`CREATE UNIQUE INDEX uq_cafes_kiosk_slug ON cafes(kiosk_slug)`);
    } catch (error) {
      // Older databases may temporarily contain duplicate/null values. Nulls are
      // allowed; only rethrow errors that are not duplicate-index/data issues.
      if (!['ER_DUP_KEYNAME', 'ER_DUP_ENTRY'].includes(error?.code)) throw error;
    }
  }

  // Preserve the seeded Demo Cafe and give it a stable friendly kiosk link.
  await db.execute(
    `UPDATE cafes
        SET kiosk_slug = COALESCE(NULLIF(kiosk_slug,''), 'cafekiosk-demo'),
            kiosk_enabled = 1,
            kiosk_slug_updated_at = COALESCE(kiosk_slug_updated_at, NOW())
      WHERE cafe_id = 'cafe-1'`
  );

  schemaReady = true;
}

async function isSlugAvailable(slug, excludeCafeId = '', db = pool) {
  await ensureSchema(db);
  const normalized = safeText(slug).toLowerCase();
  const params = [normalized];
  let sql = `SELECT cafe_id FROM cafes WHERE LOWER(kiosk_slug) = LOWER(?)`;
  if (excludeCafeId) {
    sql += ` AND cafe_id <> ?`;
    params.push(String(excludeCafeId));
  }
  sql += ` LIMIT 1`;
  const [rows] = await db.execute(sql, params);
  return rows.length === 0;
}

async function createUniqueSlug(cafeId, cafeName, db = pool) {
  await ensureSchema(db);
  const base = slugify(cafeName);
  let candidate = base;
  let counter = 2;
  while (!(await isSlugAvailable(candidate, cafeId, db))) {
    candidate = `${base.slice(0, Math.max(3, 37 - String(counter).length))}-${counter}`;
    counter += 1;
    if (counter > 9999) throw new Error('Unable to generate a unique kiosk link.');
  }
  await db.execute(
    `UPDATE cafes SET kiosk_slug=?, kiosk_enabled=1, kiosk_slug_updated_at=NOW() WHERE cafe_id=?`,
    [candidate, String(cafeId)]
  );
  return candidate;
}

async function ensureCafeSlug(cafeId, db = pool) {
  await ensureSchema(db);
  const [rows] = await db.execute(
    `SELECT cafe_id,cafe_name,kiosk_slug,kiosk_enabled FROM cafes WHERE cafe_id=? LIMIT 1`,
    [String(cafeId)]
  );
  if (!rows.length) return null;
  const row = rows[0];
  const existing = safeText(row.kiosk_slug).toLowerCase();
  if (existing) return { ...row, kiosk_slug: existing };
  const kioskSlug = await createUniqueSlug(row.cafe_id, row.cafe_name, db);
  return { ...row, kiosk_slug: kioskSlug, kiosk_enabled: 1 };
}

async function getByCafeId(cafeId, db = pool) {
  const row = await ensureCafeSlug(cafeId, db);
  if (!row) return null;
  return {
    cafeId: String(row.cafe_id),
    cafeName: row.cafe_name,
    kioskSlug: row.kiosk_slug,
    kioskEnabled: Boolean(row.kiosk_enabled),
    kioskUrl: buildKioskUrl(row.kiosk_slug)
  };
}

async function getBySlug(slug, db = pool) {
  await ensureSchema(db);
  const normalized = safeText(slug).toLowerCase();
  const [rows] = await db.execute(
    `SELECT cafe_id,cafe_name,kiosk_slug,kiosk_enabled,status
       FROM cafes
      WHERE LOWER(kiosk_slug)=LOWER(?)
      LIMIT 1`,
    [normalized]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    cafeId: String(row.cafe_id),
    cafeName: row.cafe_name,
    kioskSlug: row.kiosk_slug,
    kioskEnabled: Boolean(row.kiosk_enabled),
    cafeStatus: row.status,
    kioskUrl: buildKioskUrl(row.kiosk_slug)
  };
}

async function updateSlug(cafeId, requestedSlug, db = pool) {
  await ensureSchema(db);
  const checked = validateSlug(requestedSlug);
  if (!checked.valid) {
    const error = new Error(checked.message);
    error.code = 'INVALID_KIOSK_SLUG';
    throw error;
  }
  if (!(await isSlugAvailable(checked.slug, cafeId, db))) {
    const error = new Error('That kiosk link is already being used by another cafe.');
    error.code = 'KIOSK_SLUG_TAKEN';
    throw error;
  }
  const [result] = await db.execute(
    `UPDATE cafes
        SET kiosk_slug=?, kiosk_enabled=1, kiosk_slug_updated_at=NOW()
      WHERE cafe_id=?`,
    [checked.slug, String(cafeId)]
  );
  if (!result.affectedRows) {
    const error = new Error('Cafe account was not found.');
    error.code = 'CAFE_NOT_FOUND';
    throw error;
  }
  return getByCafeId(cafeId, db);
}

module.exports = {
  RESERVED,
  slugify,
  validateSlug,
  baseUrl,
  getPreferredLanIpv4,
  buildKioskUrl,
  ensureSchema,
  isSlugAvailable,
  createUniqueSlug,
  ensureCafeSlug,
  getByCafeId,
  getBySlug,
  updateSlug
};
