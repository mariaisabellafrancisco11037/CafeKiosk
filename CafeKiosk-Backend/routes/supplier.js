const express = require("express");
const router = express.Router();

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const { getSuppliers, createSupplier } = require("../controllers/supplierController");

router.get("/", verifyToken, isAdmin, getSuppliers);
router.post("/", verifyToken, isAdmin, createSupplier);

module.exports = router;