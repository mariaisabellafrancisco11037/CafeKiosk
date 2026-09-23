// ============================================================
// CAFEKIOSK AUTH MIDDLEWARE
// Simultaneous Admin + Staff sessions
//
// Separate role cookies:
//   cafe_admin_token
//   cafe_staff_token
//
// A Bearer token always has priority.
// ============================================================

const jwt =
    require(
        "jsonwebtoken"
    );

const dbPool = require("../config/dbPool");

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "cafekiosk-demo-secret";

const COOKIE_NAMES = {
    admin:
        "cafe_admin_token",

    manager:
        "cafe_manager_token",

    staff:
        "cafe_staff_token"
};


// ============================================================
// COOKIE HELPERS
// ============================================================

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


function verifyJwt(
    token
) {
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


function getRoleCookieToken(
    req,
    role
) {
    const cookies =
        parseCookies(
            req.headers
                ?.cookie
        );

    const key =
        normalizeRole(
            role
        );

    const cookieName =
        COOKIE_NAMES[key];

    if (!cookieName) {
        return "";
    }

    return (
        cookies[
            cookieName
        ] ||
        ""
    );
}


// ============================================================
// REQUEST USER RESOLUTION
// ============================================================

function decodeRequestUser(
    req,
    preferredRoles = []
) {

    // 1) API / JS calls explicitly identify their own session with
    // Authorization: Bearer <token>. This keeps simultaneous tabs isolated.
    const bearerToken =
        getBearerToken(
            req
        );

    const bearerUser =
        verifyJwt(
            bearerToken
        );

    if (bearerUser) {
        return bearerUser;
    }


    // 2) Page navigation has no Authorization header.
    // Try only cookies for roles accepted by that page.
    const normalizedPreferredRoles =
        preferredRoles
            .map(
                normalizeRole
            )
            .filter(
                Boolean
            );


    for (
        const role
        of normalizedPreferredRoles
    ) {

        const user =
            verifyJwt(
                getRoleCookieToken(
                    req,
                    role
                )
            );

        if (
            user &&
            normalizeRole(
                user.role
            ) ===
                role
        ) {
            return user;
        }

    }


    // 3) Generic API fallback.
    // This exists for compatibility when no preferred role was supplied.
    for (
        const role
        of [
            "admin",
            "manager",
            "staff"
        ]
    ) {

        const user =
            verifyJwt(
                getRoleCookieToken(
                    req,
                    role
                )
            );

        if (user) {
            return user;
        }

    }


    return null;
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
// DATABASE-BACKED ACCOUNT AUTHENTICATION
// ============================================================

function fallbackDemoAllowed() {
    const explicit = String(process.env.ALLOW_FALLBACK_DEMO_ACCOUNTS || "").toLowerCase();
    if (["1", "true", "yes"].includes(explicit)) return true;
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.NODE_ENV === "production") return false;
    return true;
}

async function activeDatabaseAccount(user) {
    const numericUserId = Number(user?.userId);
    const cafeId = String(user?.cafeId || "").trim();

    // Local demo fallback accounts use string ids. They are disabled on Railway
    // unless explicitly opted in.
    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
        return fallbackDemoAllowed()
            ? { ok: true, fallback: true }
            : { ok: false, status: 401, message: "This session is not backed by an approved CafeKiosk account." };
    }

    try {
        const [rows] = await dbPool.execute(
            `SELECT u.status AS user_status,
                    c.status AS cafe_status,
                    COALESCE(c.approval_status, 'Approved') AS approval_status,
                    c.cafe_name,
                    c.rejection_reason
               FROM users u
               JOIN cafes c ON c.cafe_id = u.cafe_id
              WHERE u.user_id = ? AND u.cafe_id = ?
              LIMIT 1`,
            [numericUserId, cafeId]
        );

        if (!rows.length) {
            return { ok: false, status: 401, message: "Your CafeKiosk account no longer exists." };
        }

        const row = rows[0];
        const approval = String(row.approval_status || "Approved").toLowerCase();
        if (approval === "pending") {
            return { ok: false, status: 403, message: `${row.cafe_name || "This cafe"} is awaiting System Administrator approval.` };
        }
        if (approval === "rejected") {
            return { ok: false, status: 403, message: row.rejection_reason ? `Cafe registration was not approved: ${row.rejection_reason}` : "This cafe registration was not approved." };
        }
        if (String(row.cafe_status || "").toLowerCase() !== "active") {
            return { ok: false, status: 403, message: "This cafe account is inactive." };
        }
        if (String(row.user_status || "").toLowerCase() !== "active") {
            return { ok: false, status: 401, message: "Your CafeKiosk user account is not active." };
        }
        return { ok: true, row };
    } catch (error) {
        // Compatibility for an older local database before the approval column
        // is migrated. Authentication still checks the user and cafe statuses.
        if (error?.code === "ER_BAD_FIELD_ERROR") {
            const [rows] = await dbPool.execute(
                `SELECT u.status AS user_status, c.status AS cafe_status, c.cafe_name
                   FROM users u JOIN cafes c ON c.cafe_id=u.cafe_id
                  WHERE u.user_id=? AND u.cafe_id=? LIMIT 1`,
                [numericUserId, cafeId]
            );
            if (!rows.length) return { ok: false, status: 401, message: "Your CafeKiosk account no longer exists." };
            const row = rows[0];
            return String(row.user_status).toLowerCase() === "active" && String(row.cafe_status).toLowerCase() === "active"
                ? { ok: true, row }
                : { ok: false, status: 401, message: "Your CafeKiosk account is not active." };
        }
        console.error("Authentication database verification failed:", error.message);
        return { ok: false, status: 503, message: "Authentication service is temporarily unavailable." };
    }
}

async function authenticateRequest(req, preferredRoles = []) {
    const user = decodeRequestUser(req, preferredRoles);
    if (!user) return { ok: false, status: 401, message: "Please log in first." };
    const account = await activeDatabaseAccount(user);
    if (!account.ok) return account;
    return { ok: true, user, account };
}

// ============================================================
// API AUTH
// ============================================================

async function verifyToken(
    req,
    res,
    next
) {
    const auth = await authenticateRequest(req);

    if (!auth.ok) {
        return res.status(auth.status || 401).json({ success: false, message: auth.message || "Authentication required." });
    }

    req.user = auth.user;
    return next();
}

const requireAuth =
    verifyToken;

async function optionalAuth(req, res, next) {
    const user = decodeRequestUser(req) || null;
    if (!user) {
        req.user = null;
        return next();
    }
    const account = await activeDatabaseAccount(user);
    req.user = account.ok ? user : null;
    return next();
}


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
            "manager",
            "staff"
        ].includes(
            normalizeRole(
                req.user?.role
            )
        )
    ) {

        return apiForbidden(
            res,
            "Staff, Manager, or Admin access is required."
        );

    }

    return next();
}


function requireRole(
    ...allowedRoles
) {
    return async (
        req,
        res,
        next
    ) => {
        const auth = await authenticateRequest(req, allowedRoles);

        if (!auth.ok) {
            return res.status(auth.status || 401).json({ success: false, message: auth.message || "Authentication required." });
        }

        req.user = auth.user;

        if (!roleAllowed(auth.user, allowedRoles)) {
            return apiForbidden(res);
        }

        return next();
    };
}


// ============================================================
// PAGE ROLE GUARD
//
// Admin pages:
//   requirePageRole("Admin")
//
// Staff pages:
//   requirePageRole("Admin", "Staff")
//
// If both Admin and Staff are logged in, both cookies remain valid.
// ============================================================

function requirePageRole(
    ...allowedRoles
) {
    return async (
        req,
        res,
        next
    ) => {
        const user = decodeRequestUser(req, allowedRoles);

        if (!user) {
            const normalized = allowedRoles.map(normalizeRole);
            if (normalized.length === 1 && normalized[0] === "admin") return res.redirect("/admin-login");
            if (normalized.length === 1 && normalized[0] === "manager") return res.redirect("/manager-login");
            if (normalized.length === 1 && normalized[0] === "staff") return res.redirect("/staff-login");
            return res.redirect("/login");
        }

        if (!roleAllowed(user, allowedRoles)) {
            return res.status(403).send(`
                <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Access Denied</title><style>body{font-family:Segoe UI,Arial,sans-serif;background:#f4ead9;color:#493321;margin:0;min-height:100vh;display:grid;place-items:center}.card{background:#fffaf1;padding:32px;border-radius:18px;max-width:460px;text-align:center;box-shadow:0 18px 45px rgba(81,56,36,.10)}a{display:inline-block;margin-top:16px;color:#5f9274;font-weight:700;text-decoration:none}</style></head>
                <body><div class="card"><h1>Access denied</h1><p>Your ${String(user.role || "account")} account cannot open this page.</p><a href="/login">Return to login</a></div></body></html>`);
        }

        const account = await activeDatabaseAccount(user);
        if (!account.ok) {
            const normalized = allowedRoles.map(normalizeRole);
            const target = normalized[0] === "admin" ? "/admin-login" : normalized[0] === "manager" ? "/manager-login" : normalized[0] === "staff" ? "/staff-login" : "/login";
            return res.redirect(`${target}?auth=${encodeURIComponent(account.message || "Account approval required")}`);
        }

        req.user = user;
        return next();
    };
}


module.exports = {
    COOKIE_NAMES,

    parseCookies,
    getBearerToken,
    getRoleCookieToken,
    decodeRequestUser,

    verifyToken,
    requireAuth,
    optionalAuth,

    isAdmin,
    isStaff,
    isStaffOrAdmin,

    requireRole,
    requirePageRole,
    activeDatabaseAccount
};
