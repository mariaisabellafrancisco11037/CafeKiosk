const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { requireRole } = require('../middleware/authMiddleware');
const kioskStore = require('../services/kioskAccessStore');
const catalogStore = require('../services/catalogStore');
const menuConfigStore = require('../services/menuConfigStore');
const pool = require('../config/dbPool');
const { makeRateLimit } = require('../middleware/securityRateLimit');

const { JWT_SECRET } = require('../config/security');

const kioskLookupLimiter = makeRateLimit({ windowMs: 5 * 60 * 1000, max: 120, message: 'Too many kiosk lookup requests. Please wait before trying again.' });
const kioskSetupLimiter = makeRateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: 'Too many kiosk setup attempts. Please wait before trying again.' });

function setupCafeId(token) {
  if (!token) return '';
  try {
    const payload = jwt.verify(String(token), JWT_SECRET);
    return payload?.scope === 'kiosk-setup' ? String(payload.cafeId || '') : '';
  } catch (_) {
    return '';
  }
}

router.get('/check', kioskLookupLimiter, async (req, res, next) => {
  try {
    const checked = kioskStore.validateSlug(req.query.slug);
    if (!checked.valid) {
      return res.status(400).json({ success: false, available: false, message: checked.message });
    }
    const excludeCafeId = setupCafeId(req.query.setupToken);
    const available = await kioskStore.isSlugAvailable(checked.slug, excludeCafeId);
    return res.json({
      success: true,
      slug: checked.slug,
      available,
      message: available ? 'This kiosk link is available.' : 'That kiosk link is already in use.'
    });
  } catch (error) { next(error); }
});

router.post('/setup', kioskSetupLimiter, async (req, res, next) => {
  try {
    const cafeId = setupCafeId(req.body?.setupToken);
    if (!cafeId) {
      return res.status(401).json({ success: false, message: 'Kiosk setup session expired. Please log in as Admin and change it in Settings.' });
    }
    const info = await kioskStore.updateSlug(cafeId, req.body?.slug);
    return res.json({ success: true, message: 'Kiosk link saved. Your Kiosk is now online.', kiosk: info });
  } catch (error) {
    if (error?.code === 'INVALID_KIOSK_SLUG') return res.status(400).json({ success: false, message: error.message });
    if (error?.code === 'KIOSK_SLUG_TAKEN') return res.status(409).json({ success: false, message: error.message });
    next(error);
  }
});

router.get('/public/:slug', kioskLookupLimiter, async (req, res, next) => {
  try {
    const info = await kioskStore.getBySlug(req.params.slug);
    if (!info || info.cafeStatus !== 'Active' || !info.kioskEnabled) {
      return res.status(404).json({ success: false, message: 'This kiosk link is not active.' });
    }
    return res.json({ success: true, kiosk: info });
  } catch (error) { next(error); }
});

router.get('/public/:slug/catalog', kioskLookupLimiter, async (req, res, next) => {
  try {
    const info = await kioskStore.getBySlug(req.params.slug);
    if (!info || info.cafeStatus !== 'Active' || !info.kioskEnabled) {
      return res.status(404).json({ success: false, message: 'This kiosk link is not active.' });
    }
    const [categories, products, paymentRows, taxRows, preferenceRows, menuConfig] = await Promise.all([
      catalogStore.listCategories(info.cafeId),
      catalogStore.list(info.cafeId),
      pool.execute('SELECT method_name,display_name,is_enabled,sort_order FROM payment_methods WHERE cafe_id=? ORDER BY sort_order', [info.cafeId]).then(([rows]) => rows),
      pool.execute('SELECT tax_rate_percent,service_charge_percent FROM tax_settings WHERE cafe_id=? LIMIT 1', [info.cafeId]).then(([rows]) => rows),
      pool.execute('SELECT default_order_type,currency_code,currency_symbol,receipt_footer FROM system_preferences WHERE cafe_id=? LIMIT 1', [info.cafeId]).then(([rows]) => rows),
      menuConfigStore.get(info.cafeId)
    ]);
    const paymentDefaults = [
      { methodName: 'Cash', displayName: 'Cash', isEnabled: true, sortOrder: 1 },
      { methodName: 'GCash', displayName: 'GCash / Online', isEnabled: false, sortOrder: 2 },
      { methodName: 'Card', displayName: 'Card', isEnabled: false, sortOrder: 3 },
      { methodName: 'Other', displayName: 'Other', isEnabled: false, sortOrder: 4 }
    ];
    const byMethod = new Map((paymentRows || []).map(row => [String(row.method_name), row]));
    const paymentMethods = paymentDefaults.map(def => {
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
    return res.json({
      success: true,
      cafeId: info.cafeId,
      cafeName: info.cafeName,
      kioskSlug: info.kioskSlug,
      categories,
      count: products.length,
      products,
      menuConfig: menuConfigStore.publicView(menuConfig),
      paymentMethods,
      checkout: {
        tax: Number(tax.tax_rate_percent || 0),
        service: Number(tax.service_charge_percent || 0),
        defaultOrder: preference.default_order_type || 'Dine In',
        currencyCode: preference.currency_code || 'PHP',
        currencySymbol: preference.currency_symbol || '₱',
        receiptFooter: preference.receipt_footer || ''
      }
    });
  } catch (error) { next(error); }
});

router.get('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const info = await kioskStore.getByCafeId(req.user.cafeId);
    if (!info) return res.status(404).json({ success: false, message: 'Cafe account was not found.' });
    return res.json({ success: true, kiosk: info });
  } catch (error) { next(error); }
});

router.put('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const info = await kioskStore.updateSlug(req.user.cafeId, req.body?.slug);
    return res.json({ success: true, message: 'Kiosk link updated. Your Kiosk is online and a new QR code has been generated.', kiosk: info });
  } catch (error) {
    if (error?.code === 'INVALID_KIOSK_SLUG') return res.status(400).json({ success: false, message: error.message });
    if (error?.code === 'KIOSK_SLUG_TAKEN') return res.status(409).json({ success: false, message: error.message });
    next(error);
  }
});

module.exports = router;
