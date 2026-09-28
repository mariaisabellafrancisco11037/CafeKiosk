const express = require('express');
const router = express.Router();
const pool = require('../config/dbPool');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

function bool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}
function bounded(value, min = 0, max = 100, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function text(value, max = 255) {
  return String(value ?? '').trim().slice(0, max);
}
function paymentDefaults() {
  return [
    { methodName: 'Cash', displayName: 'Cash', isEnabled: true, sortOrder: 1 },
    { methodName: 'GCash', displayName: 'GCash / Online', isEnabled: false, sortOrder: 2 },
    { methodName: 'Card', displayName: 'Card', isEnabled: false, sortOrder: 3 },
    { methodName: 'Other', displayName: 'Other', isEnabled: false, sortOrder: 4 }
  ];
}
function normalizePaymentRows(rows = []) {
  const byName = new Map((rows || []).map(row => [String(row.method_name), row]));
  return paymentDefaults().map(def => {
    const row = byName.get(def.methodName);
    return {
      methodName: def.methodName,
      displayName: text(row?.display_name || def.displayName, 40) || def.displayName,
      isEnabled: row ? Boolean(row.is_enabled) : def.isEnabled,
      sortOrder: Number(row?.sort_order || def.sortOrder)
    };
  });
}
async function readSettings(cafeId) {
  const [[storeRows], [taxRows], [prefRows], [payRows]] = await Promise.all([
    pool.execute('SELECT * FROM store_settings WHERE cafe_id=?', [cafeId]),
    pool.execute('SELECT * FROM tax_settings WHERE cafe_id=?', [cafeId]),
    pool.execute('SELECT * FROM system_preferences WHERE cafe_id=?', [cafeId]),
    pool.execute('SELECT * FROM payment_methods WHERE cafe_id=? ORDER BY sort_order', [cafeId])
  ]);
  const st = storeRows[0] || {};
  const tx = taxRows[0] || {};
  const pf = prefRows[0] || {};
  const methods = normalizePaymentRows(payRows);
  const byName = new Map(methods.map(x => [x.methodName, x]));
  return {
    cash: byName.get('Cash')?.isEnabled !== false,
    gcash: Boolean(byName.get('GCash')?.isEnabled),
    card: Boolean(byName.get('Card')?.isEnabled),
    other: Boolean(byName.get('Other')?.isEnabled),
    cashLabel: byName.get('Cash')?.displayName || 'Cash',
    gcashLabel: byName.get('GCash')?.displayName || 'GCash / Online',
    cardLabel: byName.get('Card')?.displayName || 'Card',
    otherLabel: byName.get('Other')?.displayName || 'Other',
    paymentMethods: methods,
    storeName: st.store_name || '',
    address: st.address || '',
    contact: st.contact_number || '',
    email: st.email || '',
    open: st.opening_time ? String(st.opening_time).slice(0, 5) : '',
    close: st.closing_time ? String(st.closing_time).slice(0, 5) : '',
    tax: Number(tx.tax_rate_percent || 0),
    service: Number(tx.service_charge_percent || 0),
    defaultOrder: pf.default_order_type || 'Dine In',
    lowStock: Number(pf.low_stock_warning_default || 10),
    currencyCode: pf.currency_code || 'PHP',
    currencySymbol: pf.currency_symbol || '₱',
    receiptFooter: pf.receipt_footer || ''
  };
}

// Authenticated checkout clients (Staff, Manager and Admin POS) may read the
// cafe's enabled payment methods and checkout defaults, but only Admin can edit.
router.get('/payment-options', verifyToken, async (req, res, next) => {
  try {
    const cafeId = String(req.user?.cafeId || 'cafe-1');
    const settings = await readSettings(cafeId);
    res.json({
      success: true,
      cafeId,
      paymentMethods: settings.paymentMethods.filter(x => x.isEnabled),
      checkout: {
        defaultOrder: settings.defaultOrder,
        currencyCode: settings.currencyCode,
        currencySymbol: settings.currencySymbol,
        tax: settings.tax,
        service: settings.service,
        receiptFooter: settings.receiptFooter
      }
    });
  } catch (error) { next(error); }
});

router.get('/', verifyToken, isAdmin, async (req, res, next) => {
  try {
    const cafeId = String(req.user?.cafeId || 'cafe-1');
    res.json({ success: true, cafeId, settings: await readSettings(cafeId) });
  } catch (error) { next(error); }
});

router.put('/', verifyToken, isAdmin, async (req, res, next) => {
  try {
    const cafeId = String(req.user?.cafeId || 'cafe-1');
    const s = req.body?.settings || req.body || {};
    const enabledCount = ['cash', 'gcash', 'card', 'other'].filter(key => bool(s[key], key === 'cash')).length;
    if (enabledCount < 1) return res.status(400).json({ success: false, message: 'At least one payment method must remain enabled.' });

    const tax = bounded(s.tax, 0, 100, 0);
    const service = bounded(s.service, 0, 100, 0);
    const storeName = text(s.storeName || 'CafeKiosk', 150) || 'CafeKiosk';
    const address = text(s.address, 255) || null;
    const contact = text(s.contact, 50) || null;
    const email = text(s.email, 150) || null;
    const opening = text(s.open, 8) || null;
    const closing = text(s.close, 8) || null;
    const defaultOrder = String(s.defaultOrder) === 'Take Out' ? 'Take Out' : 'Dine In';
    const lowStock = Math.max(0, Number(s.lowStock || 0) || 0);
    const currencyCode = text(s.currencyCode || 'PHP', 10) || 'PHP';
    const currencySymbol = text(s.currencySymbol || '₱', 10) || '₱';
    const receiptFooter = text(s.receiptFooter, 255) || null;

    const methods = [
      ['Cash', text(s.cashLabel || 'Cash', 40) || 'Cash', bool(s.cash, true), 1],
      ['GCash', text(s.gcashLabel || 'GCash / Online', 40) || 'GCash / Online', bool(s.gcash), 2],
      ['Card', text(s.cardLabel || 'Card', 40) || 'Card', bool(s.card), 3],
      ['Other', text(s.otherLabel || 'Other', 40) || 'Other', bool(s.other), 4]
    ];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `INSERT INTO store_settings (cafe_id,store_name,address,contact_number,email,opening_time,closing_time)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE store_name=VALUES(store_name),address=VALUES(address),contact_number=VALUES(contact_number),email=VALUES(email),opening_time=VALUES(opening_time),closing_time=VALUES(closing_time)`,
        [cafeId, storeName, address, contact, email, opening, closing]
      );
      await conn.execute('UPDATE cafes SET cafe_name=?, address=?, contact_number=?, email=?, opening_time=?, closing_time=? WHERE cafe_id=?', [storeName, address, contact, email, opening, closing, cafeId]);
      await conn.execute(
        `INSERT INTO tax_settings (cafe_id,tax_rate_percent,service_charge_percent) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE tax_rate_percent=VALUES(tax_rate_percent),service_charge_percent=VALUES(service_charge_percent)`,
        [cafeId, tax, service]
      );
      await conn.execute(
        `INSERT INTO system_preferences (cafe_id,default_order_type,low_stock_warning_default,currency_code,currency_symbol,receipt_footer)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE default_order_type=VALUES(default_order_type),low_stock_warning_default=VALUES(low_stock_warning_default),currency_code=VALUES(currency_code),currency_symbol=VALUES(currency_symbol),receipt_footer=VALUES(receipt_footer)`,
        [cafeId, defaultOrder, lowStock, currencyCode, currencySymbol, receiptFooter]
      );
      for (const method of methods) {
        await conn.execute(
          `INSERT INTO payment_methods (cafe_id,method_name,display_name,is_enabled,sort_order) VALUES (?,?,?,?,?)
           ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),is_enabled=VALUES(is_enabled),sort_order=VALUES(sort_order)`,
          [cafeId, ...method]
        );
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    res.json({ success: true, message: 'Settings saved to MySQL.', settings: await readSettings(cafeId) });
  } catch (error) { next(error); }
});

module.exports = router;
