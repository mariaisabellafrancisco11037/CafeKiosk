const express = require('express');
const router = express.Router();
const store = require('../services/catalogStore');
const pool = require('../config/dbPool');
const { verifyToken, optionalAuth, isAdmin, isOwner } = require('../middleware/authMiddleware');

async function checkoutConfig(cafeId) {
  const [[paymentRows], [taxRows], [preferenceRows]] = await Promise.all([
    pool.execute('SELECT method_name,display_name,is_enabled,sort_order FROM payment_methods WHERE cafe_id=? ORDER BY sort_order', [cafeId]),
    pool.execute('SELECT tax_rate_percent,service_charge_percent FROM tax_settings WHERE cafe_id=? LIMIT 1', [cafeId]),
    pool.execute('SELECT default_order_type,currency_code,currency_symbol,receipt_footer FROM system_preferences WHERE cafe_id=? LIMIT 1', [cafeId])
  ]);
  const defaults = [
    { methodName: 'Cash', displayName: 'Cash', isEnabled: true, sortOrder: 1 },
    { methodName: 'GCash', displayName: 'GCash / Online', isEnabled: false, sortOrder: 2 },
    { methodName: 'Card', displayName: 'Card', isEnabled: false, sortOrder: 3 },
    { methodName: 'Other', displayName: 'Other', isEnabled: false, sortOrder: 4 }
  ];
  const byMethod = new Map((paymentRows || []).map(row => [String(row.method_name), row]));
  const paymentMethods = defaults.map(def => {
    const row = byMethod.get(def.methodName);
    return {
      methodName: def.methodName,
      displayName: String(row?.display_name || def.displayName),
      isEnabled: row ? Boolean(row.is_enabled) : def.isEnabled,
      sortOrder: Number(row?.sort_order || def.sortOrder)
    };
  }).filter(method => method.isEnabled);
  const tax = taxRows?.[0] || {};
  const preference = preferenceRows?.[0] || {};
  return {
    paymentMethods,
    checkout: {
      tax: Number(tax.tax_rate_percent || 0),
      service: Number(tax.service_charge_percent || 0),
      defaultOrder: preference.default_order_type || 'Dine In',
      currencyCode: preference.currency_code || 'PHP',
      currencySymbol: preference.currency_symbol || '₱',
      receiptFooter: preference.receipt_footer || ''
    }
  };
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    // Real cafe catalogs are resolved either from the authenticated session
    // or through /api/kiosk-access/public/:slug/catalog. Do not let a guest
    // enumerate another tenant by changing ?cafeId= in DevTools.
    const requestedCafeId = String(req.query.cafeId || 'cafe-1');
    if (!req.user && requestedCafeId !== 'cafe-1') {
      return res.status(404).json({ success: false, message: 'Catalog not found.' });
    }
    const cafeId = String(req.user?.cafeId || 'cafe-1');
    const [categories, products, config] = await Promise.all([
      store.listCategories(cafeId),
      (req.query.compact === '1' ? store.listCompact(cafeId) : store.list(cafeId)),
      checkoutConfig(cafeId)
    ]);
    res.json({ success: true, cafeId, categories, count: products.length, products, ...config });
  } catch (error) { next(error); }
});


router.get('/product-image/:productId', verifyToken, async (req, res, next) => {
  try {
    const cafeId = String(req.user?.cafeId || '');
    const record = await store.getProductImage(cafeId, req.params.productId);
    if (!record || !record.image) {
      return res.status(404).end();
    }

    const image = record.image;
    if (!image.startsWith('data:image/')) {
      return res.redirect(302, image);
    }

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(image);
    if (!match) {
      return res.status(415).end();
    }

    const bytes = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', match[1]);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Length', bytes.length);
    return res.end(bytes);
  } catch (error) {
    next(error);
  }
});

router.put('/', verifyToken, isAdmin, isOwner, async (req, res, next) => {
  try {
    const cafeId = String(req.user?.cafeId || 'cafe-1');
    const products = await store.replace(
      cafeId,
      Array.isArray(req.body?.categories) ? req.body.categories : [],
      Array.isArray(req.body?.products) ? req.body.products : []
    );
    const categories = await store.listCategories(cafeId);
    res.json({ success: true, cafeId, categories, count: products.length, products });
  } catch (error) { next(error); }
});


router.put('/product-image', verifyToken, isAdmin, isOwner, async (req, res, next) => {
  try {
    const cafeId = String(req.user?.cafeId || 'cafe-1');
    const image = String(req.body?.image || '');

    // Keep the dedicated image request comfortably below the existing
    // 256 KB JSON security ceiling.
    if (!image.startsWith('data:image/') || image.length > 190000) {
      return res.status(400).json({
        success: false,
        message: 'The image is too large. Please choose the image again so CafeKiosk can optimize it.'
      });
    }

    const updated = await store.updateProductImage(cafeId, {
      productId: req.body?.productId,
      name: req.body?.name,
      category: req.body?.category,
      image
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'The product could not be found for image saving.'
      });
    }

    res.json({
      success: true,
      cafeId,
      message: 'Product image saved.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
