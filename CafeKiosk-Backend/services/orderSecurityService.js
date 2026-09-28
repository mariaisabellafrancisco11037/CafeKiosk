const pool = require("../config/dbPool");
const promotionStore = require("./promotionStore");
const { applyPromotionForOrder } = require("./promotionEngine");
const { isProduction } = require("../config/security");

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function positiveQty(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(99, Math.max(1, Math.trunc(number))) : 1;
}

function catalogKey(name, category) {
  return `${String(name || "").trim().toLowerCase()}|${String(category || "").trim().toLowerCase()}`;
}

async function productRows(cafeId) {
  const [rows] = await pool.execute(
    `SELECT p.product_id, p.product_name, p.base_price, p.manual_availability,
            c.category_name
       FROM products p
       JOIN categories c ON c.category_id=p.category_id
      WHERE p.cafe_id=? AND p.is_active=1`,
    [cafeId]
  );

  const byId = new Map();
  const byNameCategory = new Map();

  for (const row of rows) {
    byId.set(String(row.product_id), row);
    byNameCategory.set(catalogKey(row.product_name, row.category_name), row);
  }

  return { byId, byNameCategory };
}

async function taxSettings(cafeId) {
  try {
    const [rows] = await pool.execute(
      `SELECT tax_rate_percent, service_charge_percent
         FROM tax_settings
        WHERE cafe_id=?
        LIMIT 1`,
      [cafeId]
    );
    const row = rows[0] || {};
    return {
      taxRate: Math.max(0, Number(row.tax_rate_percent || 0)) / 100,
      serviceRate: Math.max(0, Number(row.service_charge_percent || 0)) / 100
    };
  } catch (_) {
    return { taxRate: 0, serviceRate: 0 };
  }
}

async function hardenOrderPayload(payload = {}, cafeId) {
  const source = String(payload.source || "Kiosk").trim().toLowerCase();
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (!rawItems.length || rawItems.length > 100) {
    const error = new Error("Order must contain between 1 and 100 items.");
    error.statusCode = 400;
    throw error;
  }

  const products = await productRows(cafeId);
  const items = rawItems.map(raw => {
    const id = String(raw?.productId ?? raw?.product_id ?? "").trim();
    const product =
      (/^\d+$/.test(id) ? products.byId.get(id) : null) ||
      products.byNameCategory.get(catalogKey(raw?.name, raw?.category));

    if (!product) {
      if (isProduction()) {
        const error = new Error("One or more order items are not valid products for this cafe.");
        error.statusCode = 400;
        throw error;
      }
      // Local legacy/demo compatibility only.
      const fallbackPrice = Math.max(0, money(raw?.price));
      const fallbackExtras = Math.max(0, money(raw?.customizationCost ?? raw?.customizationPrice));
      const qty = positiveQty(raw?.qty ?? raw?.quantity);
      return {
        ...raw,
        price: fallbackPrice,
        customizationCost: fallbackExtras,
        qty,
        quantity: qty,
        subtotal: money((fallbackPrice + fallbackExtras) * qty)
      };
    }

    if (String(product.manual_availability || "Available").toLowerCase() === "unavailable") {
      const error = new Error(`${product.product_name} is currently unavailable.`);
      error.statusCode = 409;
      throw error;
    }

    // Base price/name/category are authoritative database values.
    // Paid customizations are still represented separately, but may never be
    // negative (a common DevTools price-tampering trick).
    const basePrice = Math.max(0, money(product.base_price));
    const extras = Math.max(0, Math.min(10000, money(raw?.customizationCost ?? raw?.customizationPrice)));
    const qty = positiveQty(raw?.qty ?? raw?.quantity);

    return {
      ...raw,
      productId: String(product.product_id),
      name: product.product_name,
      category: product.category_name,
      price: basePrice,
      customizationCost: extras,
      qty,
      quantity: qty,
      subtotal: money((basePrice + extras) * qty)
    };
  });

  const subtotal = money(items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0));
  let secured = {
    ...payload,
    cafeId,
    items,
    subtotal,
    // Never accept financial summary fields from DevTools.
    discountAmount: 0,
    discount: 0,
    taxAmount: 0,
    serviceChargeAmount: 0,
    total: subtotal
  };

  // Promotions are loaded from this cafe on the server. A browser cannot
  // invent a discount value/name or borrow another cafe's promotion.
  const promotions = await promotionStore.list(cafeId);
  secured = applyPromotionForOrder(secured, promotions);

  const discounted = Math.max(0, money(Number(secured.subtotal || subtotal) - Number(secured.discountAmount || 0)));
  const rates = await taxSettings(cafeId);
  const taxAmount = money(discounted * rates.taxRate);
  const serviceChargeAmount = money(discounted * rates.serviceRate);
  const total = money(discounted + taxAmount + serviceChargeAmount);

  secured.taxAmount = taxAmount;
  secured.serviceChargeAmount = serviceChargeAmount;
  secured.total = total;

  // Change is always recalculated by the normalizer from authoritative total.
  delete secured.change;
  return secured;
}

module.exports = { hardenOrderPayload };
