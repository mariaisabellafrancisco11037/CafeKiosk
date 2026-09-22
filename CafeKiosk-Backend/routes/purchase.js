const express = require("express");
const router = express.Router();

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const { createPO } = require("../controllers/purchaseController");

router.post("/", verifyToken, isAdmin, createPO);

module.exports = router;