const express = require("express");
const router = express.Router();

const { createOrder } = require("../controllers/orderController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, createOrder);

module.exports = router;