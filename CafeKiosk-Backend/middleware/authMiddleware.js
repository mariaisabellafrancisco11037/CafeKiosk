// ============================================================
// CAFEKIOSK AUTH MIDDLEWARE
// Compatible exports:
//   verifyToken
//   isAdmin
//   isStaff
//   isStaffOrAdmin
//   requireAuth
//   requireRole(...roles)
//   requirePageRole(...roles)
// ============================================================

const jwt =
    require(
        "jsonwebtoken"
    );

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "cafekiosk-demo-secret";

const COOKIE_NAME =
    "cafe_token";


function parseCookies(
    cookieHeader
) {

    const cookies = {};

    if (!cookieHeader) {
        return cookies;
    }

    String(
        cookieHeader
    )
        .split(";")
        .forEach(
            part => {

                const index =
                    part.indexOf("=");

                if (
                    index === -1
                ) {
                    return;
                }

                const key =
                    part
                        .slice(
                            0,
                            index
                        )
                        .trim();

                const value =
                    part
                        .slice(
                            index + 1
                        )
                        .trim();

                if (!key) {
                    return;
                }

                try {

                    cookies[key] =
                        decodeURIComponent(
                            value
                        );

                } catch {

                    cookies[key] =
                        value;

                }

            }
        );

    return cookies;
}


function getBearerToken(
    req
) {

    const authorization =
        String(
            req.headers
                ?.authorization ||
            ""
        );

    if (
        !authorization
            .toLowerCase()
            .startsWith(
                "bearer "
            )
    ) {
        return "";
    }

    return authorization
        .slice(7)
        .trim();
}


function getRequestToken(
    req
) {

    const bearerToken =
        getBearerToken(
            req
        );

    if (bearerToken) {
        return bearerToken;
    }

    const cookies =
        parseCookies(
            req.headers
                ?.cookie
        );

    return (
        cookies[
            COOKIE_NAME
        ] ||
        ""
    );
}


function decodeRequestUser(
    req
) {

    const token =
        getRequestToken(
            req
        );

    if (!token) {
        return null;
    }

    try {

        return jwt.verify(
            token,
            JWT_SECRET
        );

    } catch {

        return null;

    }
}


function normalizeRole(
    value
) {

    return String(
        value ||
        ""
    )
        .trim()
        .toLowerCase();
}


function roleAllowed(
    user,
    allowedRoles
) {

    const role =
        normalizeRole(
            user?.role
        );

    return allowedRoles
        .map(
            normalizeRole
        )
        .includes(
            role
        );
}


function apiUnauthorized(
    res,
    message =
        "Authentication required."
) {

    return res
        .status(401)
        .json({
            success:
                false,

            message
        });
}


function apiForbidden(
    res,
    message =
        "You do not have permission to access this resource."
) {

    return res
        .status(403)
        .json({
            success:
                false,

            message
        });
}


// ============================================================
// API AUTH
// ============================================================

function verifyToken(
    req,
    res,
    next
) {

    const user =
        decodeRequestUser(
            req
        );

    if (!user) {

        return apiUnauthorized(
            res,
            "Please log in first."
        );

    }

    req.user =
        user;

    return next();
}


const requireAuth =
    verifyToken;


// ============================================================
// API ROLE MIDDLEWARE
// ============================================================

function isAdmin(
    req,
    res,
    next
) {

    if (
        normalizeRole(
            req.user?.role
        ) !==
        "admin"
    ) {

        return apiForbidden(
            res,
            "Admin access is required."
        );

    }

    return next();
}


function isStaff(
    req,
    res,
    next
) {

    if (
        normalizeRole(
            req.user?.role
        ) !==
        "staff"
    ) {

        return apiForbidden(
            res,
            "Staff access is required."
        );

    }

    return next();
}


function isStaffOrAdmin(
    req,
    res,
    next
) {

    if (
        ![
            "admin",
            "staff"
        ].includes(
            normalizeRole(
                req.user?.role
            )
        )
    ) {

        return apiForbidden(
            res,
            "Staff or Admin access is required."
        );

    }

    return next();
}


function requireRole(
    ...allowedRoles
) {

    return (
        req,
        res,
        next
    ) => {

        const user =
            decodeRequestUser(
                req
            );

        if (!user) {

            return apiUnauthorized(
                res,
                "Please log in first."
            );

        }

        req.user =
            user;

        if (
            !roleAllowed(
                user,
                allowedRoles
            )
        ) {

            return apiForbidden(
                res
            );

        }

        return next();
    };
}


// ============================================================
// PAGE ROLE GUARD
//
// Admin-only page:
//   requirePageRole("Admin")
//
// POS / order queue:
//   requirePageRole("Admin", "Staff")
// ============================================================

function requirePageRole(
    ...allowedRoles
) {

    return (
        req,
        res,
        next
    ) => {

        const user =
            decodeRequestUser(
                req
            );


        if (!user) {

            const normalized =
                allowedRoles
                    .map(
                        normalizeRole
                    );

            if (
                normalized.length === 1 &&
                normalized[0] ===
                    "admin"
            ) {

                return res.redirect(
                    "/admin-login"
                );

            }


            if (
                normalized.length === 1 &&
                normalized[0] ===
                    "staff"
            ) {

                return res.redirect(
                    "/staff-login"
                );

            }


            return res.redirect(
                "/login"
            );

        }


        req.user =
            user;


        if (
            !roleAllowed(
                user,
                allowedRoles
            )
        ) {

            return res
                .status(403)
                .send(`
                    <!doctype html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width,initial-scale=1">
                        <title>Access Denied</title>
                        <style>
                            body{font-family:Segoe UI,Arial,sans-serif;background:#f4ead9;color:#493321;margin:0;min-height:100vh;display:grid;place-items:center}
                            .card{background:#fffaf1;padding:32px;border-radius:18px;max-width:460px;text-align:center;box-shadow:0 18px 45px rgba(81,56,36,.10)}
                            a{display:inline-block;margin-top:16px;color:#5f9274;font-weight:700;text-decoration:none}
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Access denied</h1>
                            <p>Your ${String(user.role || "account")} account cannot open this page.</p>
                            <a href="/login">Return to login</a>
                        </div>
                    </body>
                    </html>
                `);

        }


        return next();

    };
}


module.exports = {
    parseCookies,
    getRequestToken,
    decodeRequestUser,

    verifyToken,
    requireAuth,

    isAdmin,
    isStaff,
    isStaffOrAdmin,

    requireRole,
    requirePageRole
};
