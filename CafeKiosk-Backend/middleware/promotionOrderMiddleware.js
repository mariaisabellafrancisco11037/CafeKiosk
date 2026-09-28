"use strict";

// Pricing and promotions are intentionally applied inside orderController only
// after the authenticated cafe / public kiosk slug has been resolved.
// Keeping this middleware as a no-op preserves the existing server mount order
// without trusting req.body.cafeId.
module.exports = function promotionOrderMiddleware(req, res, next) {
  next();
};
