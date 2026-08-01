const express = require("express");
const router = express.Router();

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const {
    getInventoryLogs,
    getNotifications
} = require("../controllers/adminController");

router.get("/logs", verifyToken, isAdmin, getInventoryLogs);
router.get("/notifications", verifyToken, isAdmin, getNotifications);

module.exports = router;