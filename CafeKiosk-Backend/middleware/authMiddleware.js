const jwt = require("jsonwebtoken");

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "cafekiosk-demo-secret";

function readCookie(cookieHeader, name) {
    if (!cookieHeader) {
        return null;
    }

    const cookies =
        String(cookieHeader)
            .split(";")
            .map(part => part.trim());

    for (const cookie of cookies) {
        const separatorIndex =
            cookie.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const key =
            cookie.slice(
                0,
                separatorIndex
            );

        const value =
            cookie.slice(
                separatorIndex + 1
            );

        if (key === name) {
            return decodeURIComponent(
                value
            );
        }
    }

    return null;
}

function getRequestToken(req) {
    const authHeader =
        req.headers.authorization ||
        req.headers.Authorization;

    if (
        typeof authHeader === "string" &&
        authHeader.startsWith("Bearer ")
    ) {
        return authHeader
            .slice(7)
            .trim();
    }

    return readCookie(
        req.headers.cookie,
        "cafe_token"
    );
}

function verifyJwtToken(token) {
    return jwt.verify(
        token,
        JWT_SECRET
    );
}

exports.getRequestToken =
    getRequestToken;

exports.verifyJwtToken =
    verifyJwtToken;


// =====================================================
// API TOKEN CHECK
// =====================================================

exports.verifyToken =
    (req, res, next) => {

        const token =
            getRequestToken(req);

        if (!token) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Authentication required."
                });
        }

        try {
            req.user =
                verifyJwtToken(
                    token
                );

            next();

        } catch (error) {

            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Session expired or invalid."
                });
        }
    };


// =====================================================
// ADMIN-ONLY API
// =====================================================

exports.isAdmin =
    (req, res, next) => {

        if (
            String(
                req.user?.role ||
                ""
            ).toLowerCase() !==
            "admin"
        ) {
            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "Admin only access."
                });
        }

        next();
    };


// =====================================================
// PAGE ROLE GUARD
//
// Usage:
// app.get(
//   "/pos",
//   requirePageRole("Admin", "Staff"),
//   ...
// );
// =====================================================

exports.requirePageRole =
    (...allowedRoles) => {

        const allowed =
            allowedRoles
                .map(
                    role =>
                        String(role)
                            .toLowerCase()
                );

        return (
            req,
            res,
            next
        ) => {

            const token =
                getRequestToken(req);

            if (!token) {
                return res.redirect(
                    "/login"
                );
            }

            try {
                const decoded =
                    verifyJwtToken(
                        token
                    );

                const role =
                    String(
                        decoded.role ||
                        ""
                    ).toLowerCase();

                if (
                    !allowed.includes(
                        role
                    )
                ) {
                    return res.redirect(
                        "/login"
                    );
                }

                req.user =
                    decoded;

                next();

            } catch (error) {

                return res.redirect(
                    "/login"
                );
            }
        };
    };
