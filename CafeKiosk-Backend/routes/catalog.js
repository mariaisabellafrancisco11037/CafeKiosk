const express = require('express');
const router = express.Router();
const store = require('../services/catalogStore');
const { verifyToken, optionalAuth, isAdmin } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    // Logged-in Admin/Manager/Staff always uses the cafe in the authenticated
    // session. Public legacy/demo calls may still pass cafeId explicitly.
    const cafeId = String(req.user?.cafeId || req.query.cafeId || 'cafe-1');
    const [categories, products] = await Promise.all([
      store.listCategories(cafeId),
      store.list(cafeId)
    ]);
    res.json({ success: true, cafeId, categories, count: products.length, products });
  } catch (error) { next(error); }
});

router.put('/', verifyToken, isAdmin, async (req, res, next) => {
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

module.exports = router;
