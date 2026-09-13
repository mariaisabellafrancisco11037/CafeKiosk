// ============================================================
// CAFEKIOSK AUTH CONTROLLER
// Admin + Staff JWT login
//
// This auth layer is intentionally independent from MySQL so it will not
// interfere with the JSON order/inventory backend.
//
// Optional .env overrides:
// JWT_SECRET=replace-with-a-long-random-secret
// ADMIN_USER_ID=admin
// ADMIN_PASSWORD=admin123
// ADMIN_DISPLAY_NAME=CafeKiosk Administrator
// STAFF_USER_ID=staff
// STAFF_PASSWORD=staff123
// STAFF_DISPLAY_NAME=CafeKiosk Staff
// ============================================================

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "cafekiosk-demo-secret";

const JWT_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN ||
    "8h";

const COOKIE_NAME =
    "cafe_token";

function safeText(value) {
    return String(value ?? "").trim();
}

function normalizeRole(value) {
    const role =
        safeText(value)
            .toLowerCase();

    if (role === "admin") {
        return "Admin";
    }

    if (role === "staff") {
        return "Staff";
    }

    return "";
}

function constantTimeEquals(left, right) {
    const leftHash =
        crypto
            .createHash("sha256")
            .update(String(left ?? ""))
            .digest();

    const rightHash =
        crypto
            .createHash("sha256")
            .update(String(right ?? ""))
            .digest();

    return crypto.timingSafeEqual(
        leftHash,
        rightHash
    );
}

function getAccounts() {
    return [
        {
            userId:
                process.env.ADMIN_USER_ID ||
                "admin",

            username:
                process.env.ADMIN_USER_ID ||
                "admin",

            password:
                process.env.ADMIN_PASSWORD ||
                "admin123",

            displayName:
                process.env.ADMIN_DISPLAY_NAME ||
                "CafeKiosk Administrator",

            role:
                "Admin",

            cafeId:
                process.env.CAFE_ID ||
                "cafe-1"
        },
        {
            userId:
                process.env.STAFF_USER_ID ||
                "staff",

            username:
                process.env.STAFF_USER_ID ||
                "staff",

            password:
                process.env.STAFF_PASSWORD ||
                "staff123",

            displayName:
                process.env.STAFF_DISPLAY_NAME ||
                "CafeKiosk Staff",

            role:
                "Staff",

            cafeId:
                process.env.CAFE_ID ||
                "cafe-1"
        }
    ];
}

function findAccount(username) {
    const wanted =
        safeText(username)
            .toLowerCase();

    return getAccounts()
        .find(
            account =>
                String(account.username)
                    .toLowerCase() === wanted ||
                String(account.userId)
                    .toLowerCase() === wanted
        ) ||
        null;
}

function signToken(user) {
    return jwt.sign(
        {
            userId:
                user.userId,

            username:
                user.username,

            displayName:
                user.displayName,

            role:
                user.role,

            cafeId:
                user.cafeId
        },
        JWT_SECRET,
        {
            expiresIn:
                JWT_EXPIRES_IN
        }
    );
}

function publicUser(user) {
    return {
        userId:
            user.userId,

        username:
            user.username,

        displayName:
            user.displayName,

        role:
            user.role,

        cafeId:
            user.cafeId
    };
}

function loginRedirect(role) {
    if (
        String(role)
            .toLowerCase() ===
        "admin"
    ) {
        return "/admin/order-monitor";
    }

    return "/pos";
}

function setAuthCookie(
    req,
    res,
    token
) {
    res.cookie(
        COOKIE_NAME,
        token,
        {
            httpOnly:
                true,

            sameSite:
                "lax",

            secure:
                Boolean(
                    req.secure ||
                    req.headers["x-forwarded-proto"] ===
                        "https"
                ),

            maxAge:
                8 *
                60 *
                60 *
                1000,

            path:
                "/"
        }
    );
}


// ============================================================
// POST /api/auth/login
// ============================================================

exports.login =
    async (
        req,
        res
    ) => {

        const username =
            safeText(
                req.body?.username ||
                req.body?.userId
            );

        const password =
            String(
                req.body?.password ||
                ""
            );

        const requestedRole =
            normalizeRole(
                req.body?.role
            );

        const requestedCafeId =
            safeText(
                req.body?.cafeId
            ) ||
            "cafe-1";


        if (
            !username ||
            !password
        ) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        "User ID and password are required."
                });
        }


        const account =
            findAccount(
                username
            );


        if (
            !account ||
            !constantTimeEquals(
                password,
                account.password
            )
        ) {
            return res
                .status(401)
                .json({
                    success:
                        false,

                    message:
                        "Invalid User ID or password."
                });
        }


        if (
            requestedRole &&
            requestedRole !==
                account.role
        ) {
            return res
                .status(403)
                .json({
                    success:
                        false,

                    message:
                        `This account is not authorized for ${requestedRole} login.`
                });
        }


        const user = {
            ...account,
            cafeId:
                requestedCafeId ||
                account.cafeId
        };


        const token =
            signToken(
                user
            );


        setAuthCookie(
            req,
            res,
            token
        );


        return res.json({
            success:
                true,

            message:
                "Login successful.",

            token,

            user:
                publicUser(
                    user
                ),

            redirect:
                loginRedirect(
                    user.role
                )
        });

    };


// ============================================================
// GET /api/auth/me
// req.user is supplied by verifyToken middleware.
// ============================================================

exports.me =
    (
        req,
        res
    ) => {

        return res.json({
            success:
                true,

            user:
                req.user
        });

    };


// ============================================================
// POST /api/auth/logout
// ============================================================

exports.logout =
    (
        req,
        res
    ) => {

        res.clearCookie(
            COOKIE_NAME,
            {
                httpOnly:
                    true,

                sameSite:
                    "lax",

                secure:
                    Boolean(
                        req.secure ||
                        req.headers["x-forwarded-proto"] ===
                            "https"
                    ),

                path:
                    "/"
            }
        );


        return res.json({
            success:
                true,

            message:
                "Logged out successfully."
        });

    };


// ============================================================
// GET /api/auth/health
// ============================================================

exports.health =
    (
        req,
        res
    ) => {

        return res.json({
            success:
                true,

            service:
                "CafeKiosk authentication",

            roles: [
                "Admin",
                "Staff"
            ]
        });

    };
