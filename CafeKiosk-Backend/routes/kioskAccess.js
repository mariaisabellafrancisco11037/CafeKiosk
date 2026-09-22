const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { requireRole } = require('../middleware/authMiddleware');
const kioskStore = require('../services/kioskAccessStore');
const catalogStore = require('../services/catalogStore');

const JWT_SECRET = process.env.JWT_SECRET || 'cafekiosk-demo-secret';

function setupCafeId(token) {
  if (!token) return '';
  try {
    const payload = jwt.verify(String(token), JWT_SECRET);
    return payload?.scope === 'kiosk-setup' ? String(payload.cafeId || '') : '';
  } catch (_) {
    return '';
  }
}

router.get('/check', async (req, res, next) => {
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

router.post('/setup', async (req, res, next) => {
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

router.get('/public/:slug', async (req, res, next) => {
  try {
    const info = await kioskStore.getBySlug(req.params.slug);
    if (!info || info.cafeStatus !== 'Active' || !info.kioskEnabled) {
      return res.status(404).json({ success: false, message: 'This kiosk link is not active.' });
    }
    return res.json({ success: true, kiosk: info });
  } catch (error) { next(error); }
});

router.get('/public/:slug/catalog', async (req, res, next) => {
  try {
    const info = await kioskStore.getBySlug(req.params.slug);
    if (!info || info.cafeStatus !== 'Active' || !info.kioskEnabled) {
      return res.status(404).json({ success: false, message: 'This kiosk link is not active.' });
    }
    const [categories, products] = await Promise.all([
      catalogStore.listCategories(info.cafeId),
      catalogStore.list(info.cafeId)
    ]);
    return res.json({
      success: true,
      cafeId: info.cafeId,
      cafeName: info.cafeName,
      kioskSlug: info.kioskSlug,
      categories,
      count: products.length,
      products
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
