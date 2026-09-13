// ============================================================
// CAFEKIOSK ORDER ROUTES
// ============================================================

const express =
    require("express");


const router =
    express.Router();


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
    listOrders
);


// ============================================================
// RECEIVE ORDER FROM KIOSK OR POS
// POST /api/orders
// ============================================================

router.post(
    "/",
    createOrder
);


// ============================================================
// GET ONE ORDER
// GET /api/orders/:orderId
// ============================================================

router.get(
    "/:orderId",
    getOrder
);


// ============================================================
// UPDATE STATUS
// PATCH /api/orders/:orderId/status
// ============================================================

router.patch(
    "/:orderId/status",
    updateOrder
);


// ============================================================
// OPTIONAL GENERAL PATCH
// PATCH /api/orders/:orderId
// ============================================================

router.patch(
    "/:orderId",
    patchOrder
);


module.exports =
    router;
