const express =
    require("express");

const router =
    express.Router();

const {
    login,
    me,
    logout
} = require(
    "../controllers/authController"
);

const {
    validateLogin
} = require(
    "../middleware/validation"
);

const {
    verifyToken
} = require(
    "../middleware/authMiddleware"
);


// POST /api/auth/login
router.post(
    "/login",
    validateLogin,
    login
);


// GET /api/auth/me
router.get(
    "/me",
    verifyToken,
    me
);


// POST /api/auth/logout
router.post(
    "/logout",
    logout
);


module.exports =
    router;
