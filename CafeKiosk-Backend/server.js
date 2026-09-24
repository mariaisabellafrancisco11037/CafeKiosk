require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const auditLogMiddleware = require("./middleware/auditLogMiddleware");
const dbPool = require("./config/dbPool");

const {
    requirePageRole
} = require("./middleware/authMiddleware");
const {
    requireSystemAdminPage
} = require("./middleware/systemAdminMiddleware");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const BIND_HOST = String(process.env.BIND_HOST || "0.0.0.0").trim() || "0.0.0.0";

function getLanIpv4Addresses() {
    const results = [];
    const interfaces = os.networkInterfaces();
    for (const entries of Object.values(interfaces)) {
        for (const entry of entries || []) {
            const family = typeof entry.family === "string" ? entry.family : String(entry.family);
            if ((family === "IPv4" || family === "4") && !entry.internal && entry.address && !entry.address.startsWith("169.254.")) {
                results.push(entry.address);
            }
        }
    }
    return [...new Set(results)];
}

function normalizeCafeId(value) {
    const normalized =
        String(
            value ||
            "cafe-1"
        ).trim();

    return normalized || "cafe-1";
}


// =====================================================
// PATHS
// =====================================================

const PROJECT_ROOT = path.resolve(__dirname, "..");

const FRONTEND_FOLDER = path.join(
    PROJECT_ROOT,
    "CafeKiosk-Frontend"
);


// =====================================================
// KIOSK FOLDER
// =====================================================

const KIOSK_FOLDER = path.join(
    FRONTEND_FOLDER,
    "Kiosk"
);


// =====================================================
// POS FOLDER
// =====================================================

const POS_FOLDER = path.join(
    FRONTEND_FOLDER,
    "pos"
);


// =====================================================
// ASSETS FOLDER
// =====================================================

const ASSETS_FOLDER = path.join(
    FRONTEND_FOLDER,
    "Assets"
);

const AUTH_FOLDER = path.join(
    FRONTEND_FOLDER,
    "Auth"
);

const ADMIN_FOLDER = path.join(
    FRONTEND_FOLDER,
    "Admin"
);

const SYSTEM_ADMIN_FOLDER = path.join(
    FRONTEND_FOLDER,
    "SystemAdmin"
);

const MANAGER_FOLDER = path.join(
    FRONTEND_FOLDER,
    "Manager"
);


// =====================================================
// KIOSK FILES
// =====================================================

const KIOSK_FILE = path.join(
    KIOSK_FOLDER,
    "kiosk.php"
);

const ORDER_TYPE_FILE = path.join(
    KIOSK_FOLDER,
    "order-type.php"
);

const MENU_FILE = path.join(
    KIOSK_FOLDER,
    "menu.php"
);

const CHECKOUT_FILE = path.join(
    KIOSK_FOLDER,
    "checkout.php"
);


// =====================================================
// POS FILE
// =====================================================

const POS_FILE = path.join(
    POS_FOLDER,
    "pos.php"
);


const ORDER_QUEUE_FILE = path.join(
    POS_FOLDER,
    "order-queue.php"
);

const STAFF_DASHBOARD_FILE = path.join(
    POS_FOLDER,
    "staff-dashboard.php"
);

const MANAGER_DASHBOARD_FILE = path.join(
    MANAGER_FOLDER,
    "dashboard.php"
);

const MANAGER_POS_FILE = path.join(
    MANAGER_FOLDER,
    "pos.php"
);

const MANAGER_ORDER_QUEUE_FILE = path.join(
    MANAGER_FOLDER,
    "order-queue.php"
);

const LOGIN_FILE = path.join(
    AUTH_FOLDER,
    "login.php"
);

const ADMIN_LOGIN_FILE = path.join(
    AUTH_FOLDER,
    "admin-login.php"
);

const STAFF_LOGIN_FILE = path.join(
    AUTH_FOLDER,
    "staff-login.php"
);

const MANAGER_LOGIN_FILE = path.join(
    AUTH_FOLDER,
    "manager-login.php"
);

const OWNER_SIGNUP_FILE = path.join(
    AUTH_FOLDER,
    "owner-signup.php"
);

const STAFF_SIGNUP_FILE = path.join(
    AUTH_FOLDER,
    "staff-signup.php"
);

const SYSTEM_ADMIN_LOGIN_FILE = path.join(
    AUTH_FOLDER,
    "system-admin-login.php"
);

const FORGOT_PASSWORD_FILE = path.join(
    AUTH_FOLDER,
    "forgot-password.php"
);

const RESET_PASSWORD_FILE = path.join(
    AUTH_FOLDER,
    "reset-password.php"
);

const SYSTEM_ADMIN_DASHBOARD_FILE = path.join(
    SYSTEM_ADMIN_FOLDER,
    "dashboard.php"
);

const ADMIN_MONITOR_FILE = path.join(
    ADMIN_FOLDER,
    "order-monitor.php"
);

const ADMIN_INVENTORY_FILE = path.join(
    ADMIN_FOLDER,
    "inventory.php"
);

const ADMIN_REPORT_FILE = path.join(
    ADMIN_FOLDER,
    "report.php"
);

const ADMIN_AUDIT_LOGS_FILE = path.join(
    ADMIN_FOLDER,
    "audit-logs.php"
);

const ADMIN_DASHBOARD_FILE = path.join(ADMIN_FOLDER, "dashboard.php");
const ADMIN_MENU_MANAGEMENT_FILE = path.join(ADMIN_FOLDER, "menu-management.php");
const ADMIN_PROMOTIONS_FILE = path.join(ADMIN_FOLDER, "promotions-discount.php");
const ADMIN_USERS_FILE = path.join(ADMIN_FOLDER, "user.php");
const ADMIN_SETTINGS_FILE = path.join(ADMIN_FOLDER, "settings.php");


// =====================================================
// DEBUG PATHS
// =====================================================

console.log("");

console.log(
    "======================================"
);

console.log(
    "CafeKiosk Paths"
);

console.log(
    "======================================"
);


// FRONTEND
console.log("Frontend:");
console.log(FRONTEND_FOLDER);

console.log("");


// KIOSK
console.log("Kiosk:");
console.log(KIOSK_FOLDER);

console.log("");


// POS
console.log("POS:");
console.log(POS_FOLDER);

console.log("");


// =====================================================
// CHECK KIOSK FILES
// =====================================================

console.log(
    fs.existsSync(KIOSK_FILE)
        ? "✅ kiosk.php FOUND"
        : "❌ kiosk.php NOT FOUND"
);

console.log(
    fs.existsSync(ORDER_TYPE_FILE)
        ? "✅ order-type.php FOUND"
        : "❌ order-type.php NOT FOUND"
);

console.log(
    fs.existsSync(MENU_FILE)
        ? "✅ menu.php FOUND"
        : "❌ menu.php NOT FOUND"
);

console.log(
    fs.existsSync(CHECKOUT_FILE)
        ? "✅ checkout.php FOUND"
        : "❌ checkout.php NOT FOUND"
);


// =====================================================
// CHECK POS FILE
// =====================================================

console.log(
    fs.existsSync(POS_FILE)
        ? "✅ pos.php FOUND"
        : "❌ pos.php NOT FOUND"
);


console.log(
    fs.existsSync(ORDER_QUEUE_FILE)
        ? "✅ order-queue.php FOUND"
        : "❌ order-queue.php NOT FOUND"
);


console.log(
    "======================================"
);

console.log("");


// =====================================================
// MIDDLEWARE
// =====================================================



// =====================================================
// CAFEKIOSK_PHP_EXTENSION_COMPAT_V1
// PHP-EXTENSION COMPATIBILITY
//
// CafeKiosk pages were renamed from .php to .php,
// while Node/Express remains the web server.
//
// This does NOT execute PHP code. It only tells the
// browser that renamed .php files contain HTML markup.
// =====================================================
app.use(
    (req, res, next) => {
        const requestPath =
            String(
                req.path ||
                ""
            ).toLowerCase();

        // Direct static request such as:
        // /Admin/dashboard.php or /POS/pos.php
        if (
            requestPath.endsWith(
                ".php"
            )
        ) {
            res.setHeader(
                "Content-Type",
                "text/html; charset=utf-8"
            );
        }

        // Extensionless Express routes such as /login,
        // /staff-login, /pos, etc. use res.sendFile().
        const originalSendFile =
            res.sendFile.bind(
                res
            );

        res.sendFile =
            function (
                filePath,
                options,
                callback
            ) {
                if (
                    String(
                        filePath ||
                        ""
                    )
                    .toLowerCase()
                    .endsWith(
                        ".php"
                    )
                ) {
                    res.setHeader(
                        "Content-Type",
                        "text/html; charset=utf-8"
                    );
                }

                return originalSendFile(
                    filePath,
                    options,
                    callback
                );
            };

        next();
    }
);
// =====================================================
// END CAFEKIOSK_PHP_EXTENSION_COMPAT_V1
// =====================================================

app.use(
    cors({
        // Reflect the requesting origin so cookies can work
        // from localhost, tablet IPs and VS Code Live Server.
        origin: true,
        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE"
        ]
    })
);


app.use(
    express.json()
);


app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// AUDIT LOGGING
// Records successful API mutations without changing
// existing order, inventory, menu, or auth behavior.
// =====================================================

app.use(
    "/api",
    auditLogMiddleware
);


// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(
    server,
    {
        cors: {
            origin: true,
            credentials: true,

            methods: [
                "GET",
                "POST",
                "PATCH"
            ]
        }
    }
);


app.set(
    "io",
    io
);


// =====================================================
// OPTIONAL SOCKET AUTHENTICATION
//
// Kiosk sockets may connect as guests.
// Admin / Staff sockets receive socket.user when a
// valid JWT is supplied in handshake.auth.token or
// in the cafe_token cookie.
// =====================================================

const SOCKET_JWT_SECRET =
    process.env.JWT_SECRET ||
    "cafekiosk-demo-secret";


function readSocketCookie(
    cookieHeader,
    name
) {

    if (!cookieHeader) {
        return null;
    }


    const parts =
        String(cookieHeader)
            .split(";")
            .map(
                item =>
                    item.trim()
            );


    for (
        const part
        of parts
    ) {

        const index =
            part.indexOf("=");


        if (
            index === -1
        ) {
            continue;
        }


        const key =
            part.slice(
                0,
                index
            );


        const value =
            part.slice(
                index + 1
            );


        if (
            key === name
        ) {

            return decodeURIComponent(
                value
            );

        }

    }


    return null;
}


io.use(
    (
        socket,
        next
    ) => {

        const token =
            socket.handshake
                .auth
                ?.token ||
            readSocketCookie(
                socket.handshake
                    .headers
                    ?.cookie,
                "cafe_token"
            );


        // Keep the kiosk compatible:
        // no token = guest connection.
        if (!token) {

            socket.user =
                null;

            return next();
        }


        try {

            socket.user =
                jwt.verify(
                    token,
                    SOCKET_JWT_SECRET
                );


            return next();

        } catch (error) {

            console.log(
                "🔒 Socket auth rejected:",
                error.message
            );


            return next(
                new Error(
                    "Unauthorized socket session"
                )
            );

        }

    }
);


function socketRole(
    socket
) {

    return String(
        socket.user?.role ||
        ""
    ).toLowerCase();

}


function socketCanUseStaffPages(
    socket
) {

    return [
        "admin",
        "manager",
        "staff"
    ].includes(
        socketRole(
            socket
        )
    );

}


io.on(
    "connection",
    (socket) => {

        console.log(
            `🟢 Connected: ${socket.id}` +
            (
                socket.user
                    ? ` (${socket.user.role}: ${socket.user.username})`
                    : " (guest)"
            )
        );


        // =============================================
        // AUTHENTICATED USER PRESENCE
        // =============================================

        socket.on(
            "auth:join",
            (
                payload = {},
                callback
            ) => {

                if (
                    !socket.user
                ) {

                    const result = {
                        success:
                            false,
                        message:
                            "Authentication required."
                    };


                    socket.emit(
                        "auth:error",
                        result
                    );


                    if (
                        typeof callback ===
                        "function"
                    ) {
                        callback(
                            result
                        );
                    }


                    return;
                }


                const cafeId =
                    String(
                        payload.cafeId ||
                        socket.user.cafeId ||
                        "cafe-1"
                    );


                const role =
                    String(
                        socket.user.role ||
                        "User"
                    ).toLowerCase();


                socket.join(
                    `auth-${cafeId}`
                );


                socket.join(
                    `role-${role}-${cafeId}`
                );


                socket.join(
                    `user-${socket.user.userId}`
                );


                const result = {
                    success:
                        true,
                    socketId:
                        socket.id,
                    cafeId,
                    user:
                        socket.user
                };


                socket.emit(
                    "auth:ready",
                    result
                );


                if (
                    typeof callback ===
                    "function"
                ) {
                    callback(
                        result
                    );
                }


                io.to(
                    `role-admin-${cafeId}`
                ).emit(
                    "auth:presence",
                    {
                        type:
                            "connected",
                        user: {
                            userId:
                                socket.user.userId,
                            username:
                                socket.user.username,
                            displayName:
                                socket.user.displayName,
                            role:
                                socket.user.role
                        },
                        socketId:
                            socket.id,
                        connectedAt:
                            new Date()
                                .toISOString()
                    }
                );

            }
        );


        // =============================================
        // ADMIN
        // =============================================

        socket.on(
            "join-admin",
            (cafeId) => {

                if (
                    !cafeId ||
                    socketRole(
                        socket
                    ) !==
                    "admin"
                ) {

                    socket.emit(
                        "auth:error",
                        {
                            message:
                                "Admin login required."
                        }
                    );

                    return;
                }


                const room =
                    `admin-${cafeId}`;


                socket.join(
                    room
                );


                console.log(
                    `💻 Admin joined ${room}`
                );

            }
        );


        // =============================================
        // KIOSK
        // =============================================

        socket.on(
            "join-kiosk",
            (cafeId) => {

                if (!cafeId) {
                    return;
                }


                const room =
                    `kiosk-${cafeId}`;


                socket.join(
                    room
                );


                console.log(
                    `📱 Kiosk joined ${room}`
                );

            }
        );


        // =============================================
        // POS
        // =============================================

        socket.on(
            "join-pos",
            (
                cafeId,
                callback
            ) => {

                const normalizedCafeId =
                    normalizeCafeId(
                        cafeId
                    );

                if (
                    !socketCanUseStaffPages(
                        socket
                    )
                ) {

                    const result = {
                        success: false,
                        message:
                            "Staff, Manager, or Admin login required."
                    };

                    socket.emit(
                        "auth:error",
                        result
                    );

                    if (
                        typeof callback ===
                        "function"
                    ) {
                        callback(
                            result
                        );
                    }

                    return;
                }

                const room =
                    `pos-${normalizedCafeId}`;

                socket.join(
                    room
                );

                socket.data.cafeId =
                    normalizedCafeId;

                console.log(
                    `🧾 POS joined ${room}`
                );

                if (
                    typeof callback ===
                    "function"
                ) {
                    callback({
                        success: true,
                        room,
                        cafeId:
                            normalizedCafeId
                    });
                }

            }
        );


        // =============================================
        // ORDER QUEUE
        // =============================================

        socket.on(
            "join-order-queue",
            (
                cafeId,
                callback
            ) => {

                const normalizedCafeId =
                    normalizeCafeId(
                        cafeId
                    );

                if (
                    !socketCanUseStaffPages(
                        socket
                    )
                ) {

                    const result = {
                        success: false,
                        message:
                            "Staff, Manager, or Admin login required."
                    };

                    socket.emit(
                        "auth:error",
                        result
                    );

                    if (
                        typeof callback ===
                        "function"
                    ) {
                        callback(
                            result
                        );
                    }

                    return;
                }

                const room =
                    `order-queue-${normalizedCafeId}`;

                socket.join(
                    room
                );

                socket.data.cafeId =
                    normalizedCafeId;

                console.log(
                    `📋 Order Queue joined ${room}`
                );

                if (
                    typeof callback ===
                    "function"
                ) {
                    callback({
                        success: true,
                        room,
                        cafeId:
                            normalizedCafeId
                    });
                }

            }
        );


        // =============================================
        // ORDER
        // =============================================

        socket.on(
            "join-order",
            (orderId) => {

                if (!orderId) {
                    return;
                }


                socket.join(
                    `order-${orderId}`
                );

            }
        );


        // =============================================
        // LIVE DEVICE ACTIVITY
        // =============================================

        socket.on("presence:activity", (payload = {}) => {
            const cafeId = normalizeCafeId(payload.cafeId || socket.user?.cafeId || socket.data.cafeId || "cafe-1");
            const surface = String(payload.surface || "").toLowerCase();
            if (!["pos", "kiosk", "admin", "orderqueue"].includes(surface)) return;
            socket.data.cafeId = cafeId;
            socket.data.presenceSurface = surface;
            socket.data.lastPresenceActivity = Date.now();
        });

        // =============================================
        // LOGOUT CURRENT SOCKET
        // =============================================

        socket.on(
            "auth:logout",
            () => {

                socket.disconnect(
                    true
                );

            }
        );


        // =============================================
        // DISCONNECT
        // =============================================

        socket.on(
            "disconnect",
            () => {

                console.log(
                    `🔴 Disconnected: ${socket.id}`
                );

            }
        );

    }
);


// =====================================================
// CLEAN PAGE URLS + LEGACY .PHP REDIRECTS
// Physical frontend files keep their historical .php filenames, but visitors
// use extensionless URLs. Old bookmarks are redirected so existing links do
// not break after this upgrade.
// =====================================================

const LEGACY_PAGE_REDIRECTS = new Map([
    ['/auth/login.php', '/login'], ['/auth/admin-login.php', '/admin-login'],
    ['/auth/staff-login.php', '/staff-login'], ['/auth/manager-login.php', '/manager-login'],
    ['/auth/owner-signup.php', '/owner-signup'], ['/auth/staff-signup.php', '/staff-signup'],
    ['/auth/forgot-password.php', '/forgot-password'], ['/auth/reset-password.php', '/reset-password'],
    ['/auth/system-admin-login.php', '/system-admin-login'],
    ['/admin/dashboard.php', '/admin/dashboard'], ['/admin/order-monitor.php', '/admin/order-monitor'],
    ['/admin/menu-management.php', '/admin/menu-management'], ['/admin/promotions-discount.php', '/admin/promotions'],
    ['/admin/inventory.php', '/admin/inventory'], ['/admin/report.php', '/admin/report'],
    ['/admin/audit-logs.php', '/admin/audit-logs'], ['/admin/user.php', '/admin/users'],
    ['/admin/settings.php', '/admin/settings'],
    ['/systemadmin/dashboard.php', '/system-monitor'],
    ['/manager/dashboard.php', '/manager-dashboard'], ['/manager/pos.php', '/manager-pos'],
    ['/manager/order-queue.php', '/manager-order-queue'],
    ['/pos/pos.php', '/pos'], ['/pos/order-queue.php', '/order-queue'], ['/pos/staff-dashboard.php', '/staff-dashboard'],
    ['/kiosk/kiosk.php', '/kiosk'], ['/kiosk/order-type.php', '/order-type'], ['/kiosk/menu.php', '/menu'], ['/kiosk/checkout.php', '/checkout']
]);

app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next();
    const clean = LEGACY_PAGE_REDIRECTS.get(String(req.path || '').toLowerCase());
    if (!clean) return next();
    const qIndex = String(req.originalUrl || '').indexOf('?');
    const query = qIndex >= 0 ? String(req.originalUrl).slice(qIndex) : '';
    return res.redirect(302, `${clean}${query}`);
});

app.get('/admin/dashboard', requirePageRole('Admin'), (req, res) => res.sendFile(ADMIN_DASHBOARD_FILE));
app.get('/admin/menu-management', requirePageRole('Admin'), (req, res) => res.sendFile(ADMIN_MENU_MANAGEMENT_FILE));
app.get('/admin/promotions', requirePageRole('Admin'), (req, res) => res.sendFile(ADMIN_PROMOTIONS_FILE));
app.get('/admin/users', requirePageRole('Admin'), (req, res) => res.sendFile(ADMIN_USERS_FILE));
app.get('/admin/settings', requirePageRole('Admin'), (req, res) => res.sendFile(ADMIN_SETTINGS_FILE));

app.get('/favicon.ico', (req, res) => res.sendFile(path.join(ASSETS_FOLDER, 'images', 'favicon.ico')));

// =====================================================
// ASSETS
// =====================================================

app.use(
    "/Assets",
    express.static(
        ASSETS_FOLDER
    )
);


// =====================================================
// AUTH STATIC FILES
// =====================================================

app.use(
    "/Auth",
    express.static(
        AUTH_FOLDER
    )
);


// =====================================================
// SYSTEM ADMIN STATIC FILES
// Separate technical monitor; does not inherit a cafe Admin session.
// =====================================================

app.use(
    "/SystemAdmin",
    requireSystemAdminPage,
    express.static(
        SYSTEM_ADMIN_FOLDER
    )
);

// =====================================================
// MANAGER STATIC FILES
// Operational management workspace; no owner-only Admin pages.
// =====================================================

app.use(
    "/Manager",
    requirePageRole(
        "Manager"
    ),
    express.static(
        MANAGER_FOLDER
    )
);


// =====================================================
// ADMIN STATIC FILES
//
// Protected so direct /Admin/... URLs also require
// an Admin session.
// =====================================================

app.use(
    "/Admin",
    requirePageRole(
        "Admin"
    ),
    express.static(
        ADMIN_FOLDER
    )
);



// =====================================================
// POS STATIC FILES
// =====================================================

app.use(
    "/POS",
    requirePageRole(
        "Admin",
        "Staff"
    ),
    express.static(
        POS_FOLDER
    )
);


// =====================================================
// AUTH PAGES
// =====================================================

app.get(
    "/login",
    (req, res) => {

        res.sendFile(
            LOGIN_FILE
        );

    }
);


app.get(
    "/admin-login",
    (req, res) => {

        res.sendFile(
            ADMIN_LOGIN_FILE
        );

    }
);


app.get(
    "/staff-login",
    (req, res) => {

        res.sendFile(
            STAFF_LOGIN_FILE
        );

    }
);

app.get(
    "/manager-login",
    (req, res) => {
        res.sendFile(
            MANAGER_LOGIN_FILE
        );
    }
);


app.get(
    "/forgot-password",
    (req, res) => {
        res.sendFile(FORGOT_PASSWORD_FILE);
    }
);

app.get(
    "/reset-password",
    (req, res) => {
        res.sendFile(RESET_PASSWORD_FILE);
    }
);

app.get(
    "/system-admin-login",
    (req, res) => {
        res.sendFile(
            SYSTEM_ADMIN_LOGIN_FILE
        );
    }
);

app.get(
    "/system-monitor",
    requireSystemAdminPage,
    (req, res) => {
        res.sendFile(
            SYSTEM_ADMIN_DASHBOARD_FILE
        );
    }
);

app.get(
    ["/signup", "/owner-signup"],
    (req, res) => {
        res.sendFile(OWNER_SIGNUP_FILE);
    }
);

app.get(
    "/staff-signup",
    (req, res) => {
        res.sendFile(STAFF_SIGNUP_FILE);
    }
);


// =====================================================
// ADMIN ORDER MONITOR
// =====================================================

app.get(
    "/admin/order-monitor",
    requirePageRole(
        "Admin"
    ),
    (req, res) => {

        res.sendFile(
            ADMIN_MONITOR_FILE
        );

    }
);


// =====================================================
// ADMIN INVENTORY MONITOR
// =====================================================

app.get(
    "/admin/inventory",
    requirePageRole(
        "Admin"
    ),
    (req, res) => {
        res.sendFile(
            ADMIN_INVENTORY_FILE
        );
    }
);


// =====================================================
// ADMIN REPORT & ANALYTICS
// =====================================================

app.get(
    "/admin/report",
    requirePageRole(
        "Admin"
    ),
    (req, res) => {
        res.sendFile(
            ADMIN_REPORT_FILE
        );
    }
);


// =====================================================
// ADMIN AUDIT LOGS
// =====================================================

app.get(
    "/admin/audit-logs",
    requirePageRole(
        "Admin"
    ),
    (req, res) => {
        res.sendFile(
            ADMIN_AUDIT_LOGS_FILE
        );
    }
);


// =====================================================
// KIOSK START PAGE
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            KIOSK_FILE
        );

    }
);


// =====================================================
// KIOSK PAGE
// =====================================================

app.get(
    "/kiosk",
    (req, res) => {

        res.sendFile(
            KIOSK_FILE
        );

    }
);


// =====================================================
// CAFE-SPECIFIC KIOSK ROUTES
// Each cafe gets /kiosk/<custom-slug> and keeps that slug
// through order type, menu and checkout.
// =====================================================
app.get(/^\/kiosk\/[a-z0-9-]{3,40}$/i, (req, res) => res.sendFile(KIOSK_FILE));
app.get(/^\/kiosk\/[a-z0-9-]{3,40}\/order-type$/i, (req, res) => res.sendFile(ORDER_TYPE_FILE));
app.get(/^\/kiosk\/[a-z0-9-]{3,40}\/menu$/i, (req, res) => res.sendFile(MENU_FILE));
app.get(/^\/kiosk\/[a-z0-9-]{3,40}\/checkout$/i, (req, res) => res.sendFile(CHECKOUT_FILE));


// =====================================================
// ORDER TYPE
// =====================================================

app.get(
    "/order-type",
    (req, res) => {

        res.sendFile(
            ORDER_TYPE_FILE
        );

    }
);


// =====================================================
// KIOSK MENU
// =====================================================

app.get(
    "/menu",
    (req, res) => {

        res.sendFile(
            MENU_FILE
        );

    }
);


// =====================================================
// CHECKOUT
// =====================================================

app.get(
    "/checkout",
    (req, res) => {

        res.sendFile(
            CHECKOUT_FILE
        );

    }
);


// =====================================================
// MANAGER DASHBOARD PAGE
// =====================================================

app.get(
    "/manager-dashboard",
    requirePageRole(
        "Manager"
    ),
    (req, res) => {
        if (!fs.existsSync(MANAGER_DASHBOARD_FILE)) {
            return res.status(404).send("<h1>Manager dashboard page not found</h1>");
        }
        res.sendFile(MANAGER_DASHBOARD_FILE);
    }
);


// =====================================================
// MANAGER POS PAGE
// Dedicated operational POS for Manager accounts.
// =====================================================

app.get(
    "/manager-pos",
    requirePageRole(
        "Manager"
    ),
    (req, res) => {
        if (!fs.existsSync(MANAGER_POS_FILE)) {
            return res.status(404).send("<h1>Manager POS page not found</h1>");
        }
        res.sendFile(MANAGER_POS_FILE);
    }
);

app.get(
    "/manager-order-queue",
    requirePageRole(
        "Manager"
    ),
    (req, res) => {
        if (!fs.existsSync(MANAGER_ORDER_QUEUE_FILE)) {
            return res.status(404).send("<h1>Manager Order Queue page not found</h1>");
        }
        res.sendFile(MANAGER_ORDER_QUEUE_FILE);
    }
);


// =====================================================
// STAFF DASHBOARD PAGE
// =====================================================

app.get(
    "/staff-dashboard",
    requirePageRole(
        "Admin",
        "Staff"
    ),
    (req, res) => {
        if (!fs.existsSync(STAFF_DASHBOARD_FILE)) {
            return res.status(404).send("<h1>Staff dashboard page not found</h1>");
        }
        res.sendFile(STAFF_DASHBOARD_FILE);
    }
);


// =====================================================
// POS PAGE
// =====================================================

app.get(
    "/pos",
    requirePageRole(
        "Admin",
        "Staff"
    ),
    (req, res) => {

        if (
            !fs.existsSync(
                POS_FILE
            )
        ) {

            return res
                .status(404)
                .send(`
                    <h1>
                        POS page not found
                    </h1>

                    <p>
                        Expected file:
                    </p>

                    <pre>
${POS_FILE}
                    </pre>
                `);

        }


        res.sendFile(
            POS_FILE
        );

    }
);


// =====================================================
// ORDER QUEUE PAGE
// =====================================================

app.get(
    "/order-queue",
    requirePageRole(
        "Admin",
        "Staff"
    ),
    (req, res) => {

        if (
            !fs.existsSync(
                ORDER_QUEUE_FILE
            )
        ) {

            return res
                .status(404)
                .send(`
                    <h1>
                        Order Queue page not found
                    </h1>

                    <p>
                        Expected file:
                    </p>

                    <pre>
${ORDER_QUEUE_FILE}
                    </pre>
                `);

        }

        res.sendFile(
            ORDER_QUEUE_FILE
        );

    }
);


// =====================================================
// DIRECT STATIC KIOSK ACCESS
// =====================================================

app.use(
    "/kiosk",
    express.static(
        KIOSK_FOLDER
    )
);


// =====================================================
// HEALTH
// =====================================================

app.get(
    "/health",
    (req, res) => {

        res.json({
            status: "ok",

            message:
                "CafeKiosk backend is running.",

            websocket:
                "enabled",

            kiosk:
                fs.existsSync(
                    KIOSK_FILE
                ),

            pos:
                fs.existsSync(
                    POS_FILE
                ),

            orderQueue:
                fs.existsSync(
                    ORDER_QUEUE_FILE
                ),

            staffDashboard:
                fs.existsSync(
                    STAFF_DASHBOARD_FILE
                ),

            managerPos:
                fs.existsSync(
                    MANAGER_POS_FILE
                ),

            managerOrderQueue:
                fs.existsSync(
                    MANAGER_ORDER_QUEUE_FILE
                ),

            databaseConfigured:
                process.env.CAFEKIOSK_DATABASE_UNAVAILABLE !== "1"
        });

    }
);


// =====================================================
// MYSQL DATABASE HEALTH
// =====================================================
app.get(
    "/api/db-health",
    async (req, res) => {
        try {
            const [serverRows] = await dbPool.query(
                "SELECT DATABASE() AS databaseName, VERSION() AS version, NOW() AS serverTime"
            );
            const [tableRows] = await dbPool.query(
                `SELECT COUNT(*) AS tableCount
                   FROM information_schema.tables
                  WHERE table_schema = DATABASE()
                    AND table_type = 'BASE TABLE'`
            );

            let userCount = null;
            try {
                const [userRows] = await dbPool.query("SELECT COUNT(*) AS userCount FROM users");
                userCount = Number(userRows[0]?.userCount || 0);
            } catch (_) {}

            return res.json({
                status: "ok",
                database: serverRows[0]?.databaseName || process.env.DB_NAME || "cafekiosk",
                mysqlVersion: serverRows[0]?.version || "",
                serverTime: serverRows[0]?.serverTime || null,
                tableCount: Number(tableRows[0]?.tableCount || 0),
                userCount
            });
        } catch (error) {
            return res.status(503).json({
                status: "error",
                database: process.env.DB_NAME || "cafekiosk",
                code: error.code || "DB_ERROR",
                message: error.message
            });
        }
    }
);


app.get(
    "/api/network-info",
    (req, res) => {
        const localOnly = BIND_HOST === "127.0.0.1" || BIND_HOST.toLowerCase() === "localhost" || BIND_HOST === "::1";
        const addresses = localOnly ? [] : getLanIpv4Addresses();
        res.json({
            port: Number(PORT),
            bindHost: BIND_HOST,
            mode: localOnly ? "offline-localhost" : "lan",
            requestHost: req.get("host") || "",
            lanAddresses: addresses,
            kioskUrls: addresses.map(address => `http://${address}:${PORT}`),
            websocketUrls: addresses.map(address => `ws://${address}:${PORT}/socket.io/`)
        });
    }
);

// =====================================================
// REAL-TIME ORDER NOTIFICATIONS
// =====================================================
//
// Kiosk/POS saves an order through POST /api/orders.
// Once the order route returns a successful 2xx response,
// this middleware notifies every live screen for the same cafe.
//
// POST:
//   - "new-order" carries the submitted order snapshot.
//   - "orders:changed" tells clients to sync from GET /api/orders.
//
// PATCH / PUT / DELETE:
//   - "orders:changed" tells clients to reload.
//   - "order-updated" is also emitted with the request snapshot.
//

app.use(
    "/api/orders",
    (req, res, next) => {

        const mutatingMethods =
            new Set([
                "POST",
                "PUT",
                "PATCH",
                "DELETE"
            ]);

        if (
            !mutatingMethods.has(
                req.method
            )
        ) {
            return next();
        }

        res.on(
            "finish",
            async () => {

                if (
                    res.statusCode < 200 ||
                    res.statusCode >= 300
                ) {
                    console.log(
                        `⚠️ No realtime broadcast because ${req.method} ${req.originalUrl} returned HTTP ${res.statusCode}`
                    );

                    return;
                }

                const cafeId =
                    normalizeCafeId(
                        req.body?.cafeId ||
                        req.query?.cafeId ||
                        "cafe-1"
                    );

                const changedAt =
                    new Date()
                        .toISOString();

                const changePayload = {
                    cafeId,
                    method:
                        req.method,
                    path:
                        req.originalUrl,
                    changedAt
                };

                const roomNames = [
                    `order-queue-${cafeId}`,
                    `pos-${cafeId}`,
                    `admin-${cafeId}`,
                    `kiosk-${cafeId}`
                ];

                // New orders can be rendered immediately from the submitted
                // payload while the client also keeps the normal DB sync path.
                if (
                    req.method ===
                    "POST"
                ) {

                    const newOrderPayload = {
                        ...(req.body || {}),
                        cafeId,
                        source:
                            req.body?.source ||
                            "Kiosk",
                        status:
                            req.body?.status ||
                            "Pending",
                        createdAt:
                            req.body?.createdAt ||
                            changedAt
                    };

                    for (
                        const room
                        of roomNames
                    ) {
                        io.to(
                            room
                        ).emit(
                            "new-order",
                            newOrderPayload
                        );
                    }
                }

                if (
                    req.method ===
                    "PATCH" ||
                    req.method ===
                    "PUT"
                ) {

                    const updatedPayload = {
                        ...(req.body || {}),
                        cafeId,
                        updatedAt:
                            changedAt
                    };

                    for (
                        const room
                        of roomNames
                    ) {
                        io.to(
                            room
                        ).emit(
                            "order-updated",
                            updatedPayload
                        );
                    }
                }

                for (
                    const room
                    of roomNames
                ) {
                    io.to(
                        room
                    ).emit(
                        "orders:changed",
                        changePayload
                    );
                }

                const queueCount =
                    (
                        await io.in(
                            `order-queue-${cafeId}`
                        ).fetchSockets()
                    ).length;

                const posCount =
                    (
                        await io.in(
                            `pos-${cafeId}`
                        ).fetchSockets()
                    ).length;

                console.log(
                    `🔄 ${req.method} ${req.originalUrl} -> cafe=${cafeId} | POS=${posCount} | Queue=${queueCount}`
                );

            }
        );

        next();

    }
);


// =====================================================
// REALTIME DEBUG STATUS
// =====================================================

app.get(
    "/api/realtime/status",
    async (req, res) => {

        const cafeId =
            normalizeCafeId(
                req.query.cafeId ||
                "cafe-1"
            );

        const rooms = {
            pos:
                (
                    await io.in(
                        `pos-${cafeId}`
                    ).fetchSockets()
                ).length,

            orderQueue:
                (
                    await io.in(
                        `order-queue-${cafeId}`
                    ).fetchSockets()
                ).length,

            admin:
                (
                    await io.in(
                        `admin-${cafeId}`
                    ).fetchSockets()
                ).length,

            kiosk:
                (
                    await io.in(
                        `kiosk-${cafeId}`
                    ).fetchSockets()
                ).length
        };

        res.json({
            success: true,
            cafeId,
            rooms,
            websocket:
                "enabled"
        });

    }
);


// =====================================================
// API ROUTES
// =====================================================

// V19 STAFF DASHBOARD
app.use("/api/staff/dashboard", require("./routes/staffDashboard"));

// CAFEKIOSK_FINAL_FEATURE_UPGRADE_V1
app.use("/api/orders", require("./middleware/promotionOrderMiddleware"));
app.use(
    "/api/orders",
    require(
        "./routes/order"
    )
);


app.use(
    "/api/inventory",
    require(
        "./routes/inventory"
    )
);


app.use(
    "/api/menu-availability",
    require(
        "./routes/menuAvailability"
    )
);


// =====================================================
// AUTH API
// =====================================================

app.use(
    "/api/auth",
    require(
        "./routes/auth"
    )
);


// =====================================================
// SYSTEM ADMIN / IT MONITOR API
// Read-only technical monitoring; no cafe business-edit endpoints.
// =====================================================

app.use(
    "/api/system-admin",
    require(
        "./routes/systemAdmin"
    )
);


// =====================================================
// AUDIT LOG API
// Admin-only history used by Admin/audit-logs.php.
// =====================================================

app.use(
    "/api/audit-logs",
    require(
        "./routes/auditLogs"
    )
);


// =====================================================

// CAFEKIOSK_FINAL_FEATURE_UPGRADE_V1 API ROUTES
app.use("/api/promotions", require("./routes/promotions"));
app.use("/api/menu-config", require("./routes/menuConfig"));
app.use("/api/catalog", require("./routes/catalog"));
app.use("/api/kiosk-access", require("./routes/kioskAccess"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/products", require("./routes/products"));

// FUTURE ROUTES
// =====================================================

// Uncomment these when the files exist.

/*

app.use(
    "/api/products",
    require(
        "./routes/products"
    )
);

app.use(
    "/api/admin",
    require(
        "./routes/admin"
    )
);

*/


// =====================================================
// 404
// =====================================================

app.use(
    (req, res) => {

        console.log(
            "❌ Route not found:",
            req.originalUrl
        );


        res
            .status(404)
            .send(`
                <h1>
                    404
                </h1>

                <p>
                    Route not found.
                </p>

                <p>
                    Available pages:
                </p>

                <ul>
                    <li>
                        <a href="/login">
                            Admin / Staff Login
                        </a>
                    </li>

                    <li>
                        <a href="/">
                            Kiosk
                        </a>
                    </li>

                    <li>
                        <a href="/order-type">
                            Order Type
                        </a>
                    </li>

                    <li>
                        <a href="/menu">
                            Kiosk Menu
                        </a>
                    </li>

                    <li>
                        <a href="/checkout">
                            Checkout
                        </a>
                    </li>

                    <li>
                        <a href="/pos">
                            POS
                        </a>
                    </li>

                    <li>
                        <a href="/order-queue">
                            Order Queue
                        </a>
                    </li>
                </ul>
            `);

    }
);


// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
    (
        err,
        req,
        res,
        next
    ) => {

        console.error(
            "SERVER ERROR:",
            err
        );


        res
            .status(500)
            .json({
                success: false,

                message:
                    "Internal server error."
            });

    }
);


// =====================================================
// START SERVER
// =====================================================

server.listen(
    PORT,
    BIND_HOST,
    async () => {

        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "☕ CafeKiosk Running"
        );

        console.log(
            "======================================"
        );

        console.log("");


        const railwayDomain = String(process.env.RAILWAY_PUBLIC_DOMAIN || "").trim();
        const explicitPublicUrl = String(process.env.PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || "").trim().replace(/\/+$/, "");
        const publicBaseUrl = explicitPublicUrl || (railwayDomain ? `https://${railwayDomain}` : "");

        if (publicBaseUrl) {
            console.log("🌐 Public Railway URLs:");
            console.log(`  Home/Kiosk: ${publicBaseUrl}/`);
            console.log(`  Login:      ${publicBaseUrl}/login`);
            console.log(`  POS:        ${publicBaseUrl}/pos`);
            console.log(`  Manager:    ${publicBaseUrl}/manager-pos`);
            console.log(`  Queue:      ${publicBaseUrl}/order-queue`);
            console.log(`  Admin:      ${publicBaseUrl}/admin/order-monitor`);
            console.log(`  Inventory:  ${publicBaseUrl}/admin/inventory`);
            console.log(`  Reports:    ${publicBaseUrl}/admin/report`);
            console.log(`  Audit Logs: ${publicBaseUrl}/admin/audit-logs`);
            console.log(`  IT Monitor: ${publicBaseUrl}/system-admin-login`);
            console.log("");
            console.log("Railway serves CafeKiosk through the HTTPS domain above.");
            console.log(`The Node server listens internally on ${BIND_HOST}:${PORT}; that internal address is not the customer URL.`);
            console.log("");
        } else {
            // Local laptop URLs.
            console.log(`Login: http://localhost:${PORT}/login`);
            console.log(`IT Monitor: http://localhost:${PORT}/system-admin-login`);
            console.log(`Admin: http://localhost:${PORT}/admin/order-monitor`);
            console.log(`Inventory: http://localhost:${PORT}/admin/inventory`);
            console.log(`Report: http://localhost:${PORT}/admin/report`);
            console.log(`Audit Logs: http://localhost:${PORT}/admin/audit-logs`);
            console.log(`Kiosk: http://localhost:${PORT}`);
            console.log(`POS:   http://localhost:${PORT}/pos`);
            console.log(`Manager POS: http://localhost:${PORT}/manager-pos`);
            console.log(`Manager Queue: http://localhost:${PORT}/manager-order-queue`);
            console.log(`Queue: http://localhost:${PORT}/order-queue`);
            console.log("");

            // LAN / Wi-Fi / Mobile Hotspot.
            if (BIND_HOST === "127.0.0.1" || BIND_HOST.toLowerCase() === "localhost" || BIND_HOST === "::1") {
                console.log("Offline localhost mode: this CafeKiosk instance is accessible only on this laptop.");
                console.log("No Wi-Fi or internet connection is required.");
                console.log("");
            } else {
                const lanAddresses = getLanIpv4Addresses();

                if (lanAddresses.length) {
                    console.log("LAN addresses detected:");
                    for (const address of lanAddresses) {
                        console.log(`  Kiosk:      http://${address}:${PORT}`);
                        console.log(`  POS:        http://${address}:${PORT}/pos`);
                        console.log(`  Manager POS:http://${address}:${PORT}/manager-pos`);
                        console.log(`  Order Queue:http://${address}:${PORT}/order-queue`);
                        console.log(`  Admin:      http://${address}:${PORT}/admin/dashboard`);
                        console.log(`  IT Monitor: http://${address}:${PORT}/system-admin-login`);
                        console.log(`  Health:     http://${address}:${PORT}/health`);
                        console.log("");
                    }
                } else {
                    console.log("No LAN IPv4 address detected yet.");
                    console.log("Localhost still works on this laptop: http://127.0.0.1:" + PORT);
                    console.log("");
                }

                console.log("For a tablet/phone, localhost will NOT work because it points to that device itself.");
                console.log("Use a LAN address above or connect the device to the laptop's Mobile Hotspot (internet is not required).");
                console.log("");
            }
        }

        console.log(
            "🔌 Socket.IO enabled"
        );

        try {
            const [dbRows] = await dbPool.query(
                "SELECT DATABASE() AS databaseName, VERSION() AS version"
            );
            console.log(`🟢 MySQL connected: ${dbRows[0]?.databaseName || process.env.DB_NAME || "cafekiosk"} @ ${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}`);
        } catch (error) {
            console.log(`🔴 MySQL not connected: ${error.code || "DB_ERROR"} - ${error.message}`);
            if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
                console.log("   Railway: attach/reference the MySQL service with MYSQL_URL=${{MySQL.MYSQL_URL}}.");
            } else {
                console.log("   Local: run CONFIGURE_MYSQL_CONNECTION.bat, then restart CafeKiosk.");
            }
        }

        console.log(
            "======================================"
        );

    }
);