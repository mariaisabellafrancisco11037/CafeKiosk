'use strict';

// Idempotent Demo Cafe bootstrap for Railway/local MySQL.
// Only cafe-1 receives demo data. Real owner-created cafes remain untouched.

const pool = require('./config/dbPool');
const appState = require('./services/appStateStore');
const menuConfigStore = require('./services/menuConfigStore');
const recipeStore = require('./services/recipeInventoryStore');
const demo = require('./data/demo-cafe-catalog.json');

const CAFE_ID = 'cafe-1';

const CATEGORY_CANONICAL_ALIASES = {
  coffee: ['coffee'],
  'non-coffee': ['non-coffee'],
  milktea: ['milktea', 'milk-tea'],
  food: ['food', 'foods'],
  snack: ['snack', 'snacks'],
  dessert: ['dessert']
};

function normalizeRecipeCategory(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  const map = {
    coffee: 'coffee', coffees: 'coffee',
    'non-coffee': 'non-coffee', 'non-coffees': 'non-coffee', noncoffee: 'non-coffee',
    'milk-tea': 'milktea', milktea: 'milktea',
    food: 'food', foods: 'food',
    snack: 'snack', snacks: 'snack',
    dessert: 'dessert', desserts: 'dessert'
  };
  return map[key] || key;
}

function productConfigKey(product) {
  const category = demo.categories.find(row => row.key === product.categoryKey);
  const configKey = category?.configKey || product.categoryKey;
  return `${configKey}::${String(product.name || '').trim().toLowerCase()}`;
}

function addOnPrice(categoryKey, optionValue) {
  const category = demo.categories.find(row => row.key === categoryKey);
  const needle = String(optionValue || '').trim().toLowerCase();
  const match = (category?.addons || []).find(row => String(row.label || '').trim().toLowerCase() === needle);
  return Number(match?.price || 0);
}

async function ensureDemoCafeExists() {
  const [rows] = await pool.execute('SELECT cafe_id FROM cafes WHERE cafe_id=? LIMIT 1', [CAFE_ID]);
  if (rows.length) return;

  await pool.execute(
    `INSERT INTO cafes (cafe_id, cafe_name, kiosk_slug, kiosk_enabled, kiosk_slug_updated_at, timezone, status)
     VALUES (?, ?, 'cafekiosk-demo', 1, CURRENT_TIMESTAMP, 'Asia/Manila', 'Active')`,
    [CAFE_ID, demo.cafeName || 'CafeKiosk Demo Cafe']
  );
}

async function ensureCategoriesAndProducts() {
  const categoryIds = new Map();
  let categoriesAdded = 0;
  let productsAdded = 0;

  for (let index = 0; index < demo.categories.length; index += 1) {
    const category = demo.categories[index];
    const aliases = CATEGORY_CANONICAL_ALIASES[category.key] || [category.key];
    const placeholders = aliases.map(() => '?').join(',');

    const [existing] = await pool.execute(
      `SELECT category_id, category_name, canonical_key
         FROM categories
        WHERE cafe_id=?
          AND (LOWER(category_name)=LOWER(?) OR canonical_key IN (${placeholders}))
        ORDER BY category_id
        LIMIT 1`,
      [CAFE_ID, category.name, ...aliases]
    );

    let categoryId;
    if (existing.length) {
      categoryId = Number(existing[0].category_id);
      await pool.execute(
        `UPDATE categories
            SET status='Active', sort_order=?, image_path=COALESCE(image_path, ?)
          WHERE category_id=?`,
        [index + 1, category.image || null, categoryId]
      );
    } else {
      const [result] = await pool.execute(
        `INSERT INTO categories
           (cafe_id, category_name, canonical_key, image_path, sort_order, status)
         VALUES (?, ?, ?, ?, ?, 'Active')`,
        [CAFE_ID, category.name, aliases[0], category.image || null, index + 1]
      );
      categoryId = Number(result.insertId);
      categoriesAdded += 1;
    }

    categoryIds.set(category.key, categoryId);

    // Category defaults are normalized too, so Workbench reflects the demo sizes.
    if (Array.isArray(category.sizes) && category.sizes.length) {
      const [[countRow]] = await pool.execute(
        'SELECT COUNT(*) AS n FROM category_default_sizes WHERE category_id=?',
        [categoryId]
      );
      if (Number(countRow?.n || 0) === 0) {
        for (let sizeIndex = 0; sizeIndex < category.sizes.length; sizeIndex += 1) {
          const size = category.sizes[sizeIndex];
          await pool.execute(
            `INSERT INTO category_default_sizes
               (category_id, size_name, additional_price, recipe_multiplier, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [categoryId, size.label, Number(size.priceAdd || 0), Number(size.multiplier || 1), sizeIndex]
          );
        }
      }
    }
  }

  for (const product of demo.products) {
    const categoryId = categoryIds.get(product.categoryKey);
    if (!categoryId) continue;

    const [existing] = await pool.execute(
      'SELECT product_id FROM products WHERE cafe_id=? AND product_name=? LIMIT 1',
      [CAFE_ID, product.name]
    );

    let productId;
    if (existing.length) {
      productId = Number(existing[0].product_id);
    } else {
      const [result] = await pool.execute(
        `INSERT INTO products
           (cafe_id, category_id, product_name, base_price, manual_availability, is_active, sort_order)
         VALUES (?, ?, ?, ?, 'Available', 1, ?)`,
        [CAFE_ID, categoryId, product.name, Number(product.price || 0), Number(product.sortOrder || 0)]
      );
      productId = Number(result.insertId);
      productsAdded += 1;
    }

    const category = demo.categories.find(row => row.key === product.categoryKey);
    if (productId && Array.isArray(category?.sizes) && category.sizes.length) {
      const [[sizeCount]] = await pool.execute(
        'SELECT COUNT(*) AS n FROM product_sizes WHERE product_id=?',
        [productId]
      );
      if (Number(sizeCount?.n || 0) === 0) {
        for (let sizeIndex = 0; sizeIndex < category.sizes.length; sizeIndex += 1) {
          const size = category.sizes[sizeIndex];
          await pool.execute(
            `INSERT INTO product_sizes
               (product_id, size_name, additional_price, recipe_multiplier, sort_order, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [productId, size.label, Number(size.priceAdd || 0), Number(size.multiplier || 1), sizeIndex]
          );
        }
      }
    }
  }

  const [[countRow]] = await pool.execute(
    'SELECT COUNT(*) AS n FROM products WHERE cafe_id=? AND is_active=1',
    [CAFE_ID]
  );

  return {
    categoriesAdded,
    productsAdded,
    activeProducts: Number(countRow?.n || 0)
  };
}

async function ensureRecipeInventory() {
  let config = await recipeStore.getAdminConfig(CAFE_ID);
  const beforeRecipes = Array.isArray(config.recipes) ? config.recipes.length : 0;
  const beforeIngredients = Array.isArray(config.ingredients) ? config.ingredients.length : 0;

  if (beforeRecipes < demo.products.length || beforeIngredients === 0) {
    await recipeStore.seedSampleIngredients(CAFE_ID);
    config = await recipeStore.getAdminConfig(CAFE_ID);
  }

  return config;
}

async function ensureMenuConfig(recipeConfig) {
  const current = await menuConfigStore.get(CAFE_ID);
  const next = {
    products: { ...(current?.products || {}) },
    categoryDefaults: { ...(current?.categoryDefaults || {}) }
  };

  const ingredientMap = new Map(
    (recipeConfig.ingredients || []).map(row => [String(row.id), row])
  );
  const recipeMap = new Map(
    (recipeConfig.recipes || []).map(row => [
      `${normalizeRecipeCategory(row.category)}::${String(row.itemName || '').trim().toLowerCase()}`,
      row
    ])
  );

  let configsAdded = 0;
  let defaultsAdded = 0;

  for (const category of demo.categories) {
    if (!Object.prototype.hasOwnProperty.call(next.categoryDefaults, category.configKey)) {
      next.categoryDefaults[category.configKey] = Array.isArray(category.sizes) ? category.sizes : [];
      defaultsAdded += 1;
    }
  }

  for (const product of demo.products) {
    const key = productConfigKey(product);
    if (next.products[key]) continue;

    const recipe = recipeMap.get(
      `${normalizeRecipeCategory(product.categoryKey)}::${String(product.name).trim().toLowerCase()}`
    );
    const category = demo.categories.find(row => row.key === product.categoryKey);

    const richIngredients = (recipe?.ingredients || []).map(row => {
      const ingredient = ingredientMap.get(String(row.ingredientId)) || {};
      return {
        name: ingredient.name || row.ingredientId || '',
        amount: Number(row.amount || 0),
        unit: ingredient.unit || 'g',
        stock: Number(ingredient.stock || 0),
        lowStockThreshold: Number(ingredient.lowStockThreshold || 0),
        mode: row.mode === 'option' ? 'option' : 'required',
        optionValue: row.optionValue || '',
        optionPrice: row.mode === 'option' ? addOnPrice(product.categoryKey, row.optionValue) : 0,
        scaleWithSize: row.scaleWithSize !== false
      };
    });

    next.products[key] = {
      productName: product.name,
      category: product.category,
      sizes: Array.isArray(category?.sizes) ? category.sizes : [],
      ingredients: richIngredients,
      demoSeed: true,
      updatedAt: new Date().toISOString()
    };
    configsAdded += 1;
  }

  if (configsAdded || defaultsAdded) {
    await menuConfigStore.put(CAFE_ID, next);
  }

  return {
    configsAdded,
    defaultsAdded,
    totalProductConfigs: Object.keys(next.products).length,
    totalCategoryDefaults: Object.keys(next.categoryDefaults).length
  };
}

async function syncNormalizedRecipeRows(recipeConfig) {
  const [ingredientRows] = await pool.execute(
    'SELECT ingredient_id, ingredient_code FROM ingredients WHERE cafe_id=?',
    [CAFE_ID]
  );
  const ingredientIdByCode = new Map(
    ingredientRows.map(row => [String(row.ingredient_code), Number(row.ingredient_id)])
  );

  let productsSynced = 0;

  for (const recipe of recipeConfig.recipes || []) {
    const [products] = await pool.execute(
      'SELECT product_id FROM products WHERE cafe_id=? AND product_name=? LIMIT 1',
      [CAFE_ID, recipe.itemName]
    );
    if (!products.length) continue;

    const productId = Number(products[0].product_id);
    const [[countRow]] = await pool.execute(
      'SELECT COUNT(*) AS n FROM product_recipe_ingredients WHERE product_id=?',
      [productId]
    );
    if (Number(countRow?.n || 0) > 0) continue;

    let sortOrder = 0;
    for (const row of recipe.ingredients || []) {
      const ingredientId = ingredientIdByCode.get(String(row.ingredientId));
      if (!ingredientId) continue;
      await pool.execute(
        `INSERT INTO product_recipe_ingredients
           (product_id, ingredient_id, base_quantity, usage_type, option_name, scale_with_size, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          ingredientId,
          Number(row.amount || 0),
          row.mode === 'option' ? 'Option' : 'Required',
          row.optionValue || null,
          row.scaleWithSize === false ? 0 : 1,
          sortOrder++
        ]
      );
    }
    productsSynced += 1;
  }

  return { productsSynced };
}

async function seedDemoCafe() {
  if (String(process.env.AUTO_SEED_DEMO || 'true').toLowerCase() === 'false') {
    return { skipped: true, reason: 'AUTO_SEED_DEMO=false' };
  }

  await ensureDemoCafeExists();
  await appState.ensureTable();

  const catalog = await ensureCategoriesAndProducts();
  const recipeConfig = await ensureRecipeInventory();
  const menuConfig = await ensureMenuConfig(recipeConfig);
  const normalizedRecipes = await syncNormalizedRecipeRows(recipeConfig);

  return {
    skipped: false,
    cafeId: CAFE_ID,
    catalog,
    ingredients: (recipeConfig.ingredients || []).length,
    recipes: (recipeConfig.recipes || []).length,
    menuConfig,
    normalizedRecipes
  };
}

module.exports = seedDemoCafe;

if (require.main === module) {
  seedDemoCafe()
    .then(result => {
      console.log('CafeKiosk Demo Cafe seed:', result);
      process.exitCode = 0;
    })
    .catch(error => {
      console.error('CafeKiosk Demo Cafe seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      try { await pool.end(); } catch (_) {}
    });
}
