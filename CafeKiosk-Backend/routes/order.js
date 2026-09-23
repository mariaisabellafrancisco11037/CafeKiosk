// ============================================================
// CAFEKIOSK ORDER ROUTES
// ============================================================

const express =
    require("express");


const router =
    express.Router();

const { optionalAuth, requireRole } = require("../middleware/authMiddleware");


const {
    createOrder,
    listOrders,
    getOrder,
    updateOrder,
    patchOrder,
    orderHealth
} = require(
    "../controllers/orderController"
);


// ============================================================
// HEALTH
// GET /api/orders/health
// ============================================================

router.get(
    "/health",
    orderHealth
);


// ============================================================
// LIST ORDER QUEUE
// GET /api/orders?cafeId=cafe-1
// ============================================================

router.get(
    "/",
    requireRole("Admin", "Manager", "Staff"),
    listOrders
);


// ============================================================
// RECEIVE ORDER FROM KIOSK OR POS
// POST /api/orders
// ============================================================

router.post(
    "/",
    optionalAuth,
    createOrder
);


// ============================================================
// GET ONE ORDER
// GET /api/orders/:orderId
// ============================================================

router.get(
    "/:orderId",
    requireRole("Admin", "Manager", "Staff"),
    getOrder
);


// ============================================================
// UPDATE STATUS
// PATCH /api/orders/:orderId/status
// ============================================================

router.patch(
    "/:orderId/status",
    requireRole("Admin", "Manager", "Staff"),
    updateOrder
);


// ============================================================
// OPTIONAL GENERAL PATCH
// PATCH /api/orders/:orderId
// ============================================================

router.patch(
    "/:orderId",
    requireRole("Admin", "Manager", "Staff"),
    patchOrder
);


module.exports =
    router;
