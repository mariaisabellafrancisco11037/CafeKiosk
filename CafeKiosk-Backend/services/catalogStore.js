const pool = require('../config/dbPool');

function normKey(v) {
  const s = String(v || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  const m = {
    coffees: 'coffee',
    'non-coffees': 'non-coffee',
    noncoffee: 'non-coffee',
    'milk-tea': 'milktea',
    'milk tea': 'milktea',
    foods: 'food',
    snacks: 'snack',
    desserts: 'dessert'
  };
  return m[s] || s;
}

function displayName(k) {
  return ({
    coffee: 'Coffee',
    'non-coffee': 'Non-Coffee',
    milktea: 'Milktea',
    food: 'Food',
    snack: 'Snack',
    dessert: 'Dessert'
  })[k] || k;
}

async function listCategories(cafeId = 'cafe-1') {
  const [rows] = await pool.execute(
    `SELECT category_id, category_name, canonical_key, image_path, sort_order, status
       FROM categories
      WHERE cafe_id=? AND status='Active'
      ORDER BY sort_order, category_name`,
    [String(cafeId)]
  );

  return rows.map(r => ({
    id: String(r.category_id),
    name: r.category_name,
    canonicalKey: r.canonical_key,
    image: r.image_path || '',
    sortOrder: Number(r.sort_order || 0)
  }));
}

async function list(cafeId = 'cafe-1') {
  const [rows] = await pool.execute(
    `SELECT p.product_id, p.product_name, p.base_price, p.description,
            p.image_path, p.manual_availability, p.sort_order,
            c.category_name, c.canonical_key, c.sort_order category_sort
       FROM products p
       JOIN categories c ON c.category_id=p.category_id
      WHERE p.cafe_id=? AND p.is_active=1
      ORDER BY c.sort_order, p.sort_order, p.product_name`,
    [String(cafeId)]
  );

  return rows.map(r => ({
    id: String(r.product_id),
    name: r.product_name,
    categoryKey: r.canonical_key,
    category: r.category_name,
    price: Number(r.base_price || 0),
    description: r.description || '',
    image: r.image_path || '',
    availability: r.manual_availability || 'Available'
  }));
}

async function ensureCategory(conn, cafeId, category, sortOrder, catMap, keptCategoryIds) {
  const key = normKey(category?.canonicalKey || category?.key || category?.name || category);
  if (!key) return null;

  if (catMap.has(key)) {
    const existing = catMap.get(key);
    keptCategoryIds.add(Number(existing));
    return existing;
  }

  const name = String(category?.name || displayName(key));
  const image = category?.image || category?.imagePath || null;

  const [result] = await conn.execute(
    `INSERT INTO categories
       (cafe_id, category_name, canonical_key, image_path, sort_order, status)
     VALUES (?,?,?,?,?,'Active')
     ON DUPLICATE KEY UPDATE
       category_name=VALUES(category_name),
       image_path=COALESCE(VALUES(image_path), image_path),
       sort_order=VALUES(sort_order),
       status='Active',
       category_id=LAST_INSERT_ID(category_id)`,
    [cafeId, name, key, image, Number(sortOrder || 0)]
  );

  const categoryId = Number(result.insertId);
  catMap.set(key, categoryId);
  keptCategoryIds.add(categoryId);
  return categoryId;
}

async function replace(cafeId = 'cafe-1', categories = [], products = []) {
  const tenantId = String(cafeId);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const catMap = new Map();
    const keptCategoryIds = new Set();
    const keptProductIds = new Set();

    for (let index = 0; index < categories.length; index += 1) {
      await ensureCategory(
        conn,
        tenantId,
        categories[index],
        index,
        catMap,
        keptCategoryIds
      );
    }

    for (let index = 0; index < products.length; index += 1) {
      const p = products[index] || {};
      const categoryKey = normKey(p.categoryKey || p.category);
      if (!categoryKey) continue;

      const categoryId = await ensureCategory(
        conn,
        tenantId,
        { canonicalKey: categoryKey, name: p.category || displayName(categoryKey) },
        categories.length + index,
        catMap,
        keptCategoryIds
      );

      if (!categoryId) continue;

      const name = String(p.name || 'Item').trim() || 'Item';
      const availability = String(p.availability || 'Available') === 'Unavailable'
        ? 'Unavailable'
        : 'Available';

      let productId = null;
      const incomingIdText = String(p.id ?? '').trim();

      // Existing MySQL product IDs are authoritative. This keeps an Edit operation
      // on the same row even when the owner renames the product or moves categories.
      if (/^\d+$/.test(incomingIdText)) {
        const incomingId = Number(incomingIdText);
        const [ownedRows] = await conn.execute(
          'SELECT product_id FROM products WHERE cafe_id=? AND product_id=? LIMIT 1',
          [tenantId, incomingId]
        );

        if (ownedRows.length) {
          await conn.execute(
            `UPDATE products
                SET category_id=?, product_code=?, product_name=?, description=?,
                    base_price=?, image_path=?, manual_availability=?, is_active=1,
                    sort_order=?
              WHERE cafe_id=? AND product_id=?`,
            [
              categoryId,
              p.productCode || null,
              name,
              p.description || null,
              Number(p.price || 0),
              p.image || null,
              availability,
              Number(p.sortOrder ?? index),
              tenantId,
              incomingId
            ]
          );
          productId = incomingId;
        }
      }

      // New/local items do not yet have a real MySQL ID. Insert them, or update
      // the matching cafe/category/name row if it already exists.
      if (!productId) {
        const [result] = await conn.execute(
          `INSERT INTO products
             (cafe_id, category_id, product_code, product_name, description,
              base_price, image_path, manual_availability, is_active, sort_order)
           VALUES (?,?,?,?,?,?,?,?,1,?)
           ON DUPLICATE KEY UPDATE
             category_id=VALUES(category_id),
             product_code=VALUES(product_code),
             description=VALUES(description),
             base_price=VALUES(base_price),
             image_path=VALUES(image_path),
             manual_availability=VALUES(manual_availability),
             is_active=1,
             sort_order=VALUES(sort_order),
             product_id=LAST_INSERT_ID(product_id)`,
          [
            tenantId,
            categoryId,
            p.productCode || null,
            name,
            p.description || null,
            Number(p.price || 0),
            p.image || null,
            availability,
            Number(p.sortOrder ?? index)
          ]
        );
        productId = Number(result.insertId);
      }

      if (productId) keptProductIds.add(productId);
    }

    // The PUT /api/catalog endpoint represents the complete active catalog.
    // Anything the owner deleted from Menu Management must therefore stop being
    // active in MySQL, otherwise it returns after the next refresh.
    if (keptProductIds.size) {
      const ids = [...keptProductIds];
      const placeholders = ids.map(() => '?').join(',');
      await conn.execute(
        `UPDATE products
            SET is_active=0
          WHERE cafe_id=? AND product_id NOT IN (${placeholders})`,
        [tenantId, ...ids]
      );
    } else {
      await conn.execute('UPDATE products SET is_active=0 WHERE cafe_id=?', [tenantId]);
    }

    // Keep category deletion consistent with the full-catalog replacement model.
    // Existing rows are retained for referential/audit safety but no longer appear.
    if (keptCategoryIds.size) {
      const ids = [...keptCategoryIds];
      const placeholders = ids.map(() => '?').join(',');
      await conn.execute(
        `UPDATE categories
            SET status='Inactive'
          WHERE cafe_id=? AND category_id NOT IN (${placeholders})`,
        [tenantId, ...ids]
      );
    } else {
      await conn.execute("UPDATE categories SET status='Inactive' WHERE cafe_id=?", [tenantId]);
    }

    await conn.commit();
    return list(tenantId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { list, listCategories, replace, normKey };
