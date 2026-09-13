// ============================================================
// CAFEKIOSK AUTH ROUTES
// Mounted in server.js as:
// app.use("/api/auth", require("./routes/auth"));
// ============================================================

const express =
    require(
        "express"
    );

const router =
    express.Router();

const controller =
    require(
        "../controllers/authController"
    );

const {
    verifyToken
} =
    require(
        "../middleware/authMiddleware"
    );


router.get(
    "/health",
    controller.health
);


router.post(
    "/login",
    controller.login
);


// Optional explicit aliases.
// The supplied frontend uses /api/auth/login.
router.post(
    "/admin-login",
    (
        req,
        res,
        next
    ) => {

        req.body = {
            ...req.body,
            role:
                "Admin"
        };

        return controller.login(
            req,
            res,
            next
        );
    }
);


router.post(
    "/staff-login",
    (
        req,
        res,
        next
    ) => {

        req.body = {
            ...req.body,
            role:
                "Staff"
        };

        return controller.login(
            req,
            res,
            next
        );
    }
);


router.get(
    "/me",
    verifyToken,
    controller.me
);


router.post(
    "/logout",
    controller.logout
);


module.exports =
    router;
