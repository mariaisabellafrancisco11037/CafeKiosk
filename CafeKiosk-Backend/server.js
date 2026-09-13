require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const {
    requirePageRole
} = require("./middleware/authMiddleware");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

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
    "kiosk"
);


// =====================================================
// POS FOLDER
// =====================================================

const POS_FOLDER = path.join(
    FRONTEND_FOLDER,
    "POS"
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


// =====================================================
// KIOSK FILES
// =====================================================

const KIOSK_FILE = path.join(
    KIOSK_FOLDER,
    "kiosk.html"
);

const ORDER_TYPE_FILE = path.join(
    KIOSK_FOLDER,
    "order-type.html"
);

const MENU_FILE = path.join(
    KIOSK_FOLDER,
    "menu.html"
);

const CHECKOUT_FILE = path.join(
    KIOSK_FOLDER,
    "checkout.html"
);


// =====================================================
// POS FILE
// =====================================================

const POS_FILE = path.join(
    POS_FOLDER,
    "pos.html"
);


const ORDER_QUEUE_FILE = path.join(
    POS_FOLDER,
    "order-queue.html"
);

const LOGIN_FILE = path.join(
    AUTH_FOLDER,
    "login.html"
);

const ADMIN_LOGIN_FILE = path.join(
    AUTH_FOLDER,
    "admin-login.html"
);

const STAFF_LOGIN_FILE = path.join(
    AUTH_FOLDER,
    "staff-login.html"
);

const ADMIN_MONITOR_FILE = path.join(
    ADMIN_FOLDER,
    "order-monitor.html"
);

const ADMIN_INVENTORY_FILE = path.join(
    ADMIN_FOLDER,
    "inventory.html"
);


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
        ? "✅ kiosk.html FOUND"
        : "❌ kiosk.html NOT FOUND"
);

console.log(
    fs.existsSync(ORDER_TYPE_FILE)
        ? "✅ order-type.html FOUND"
        : "❌ order-type.html NOT FOUND"
);

console.log(
    fs.existsSync(MENU_FILE)
        ? "✅ menu.html FOUND"
        : "❌ menu.html NOT FOUND"
);

console.log(
    fs.existsSync(CHECKOUT_FILE)
        ? "✅ checkout.html FOUND"
        : "❌ checkout.html NOT FOUND"
);


// =====================================================
// CHECK POS FILE
// =====================================================

console.log(
    fs.existsSync(POS_FILE)
        ? "✅ pos.html FOUND"
        : "❌ pos.html NOT FOUND"
);


console.log(
    fs.existsSync(ORDER_QUEUE_FILE)
        ? "✅ order-queue.html FOUND"
        : "❌ order-queue.html NOT FOUND"
);


console.log(
    "======================================"
);

console.log("");


// =====================================================
// MIDDLEWARE
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
                            "Staff or Admin login required."
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
                            "Staff or Admin login required."
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
                )
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
    "0.0.0.0",
    () => {

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


        // LAPTOP
        console.log(
            `Login: http://localhost:${PORT}/login`
        );

        console.log(
            `Admin: http://localhost:${PORT}/admin/order-monitor`
        );
        console.log(
            `Inventory: http://localhost:${PORT}/admin/inventory`
        );

        console.log(
            `Kiosk: http://localhost:${PORT}`
        );

        console.log(
            `POS:   http://localhost:${PORT}/pos`
        );


        console.log(
            `Queue: http://localhost:${PORT}/order-queue`
        );


        console.log("");


        // WIFI
        console.log(
            `Device Login: http://192.168.254.107:${PORT}/login`
        );

        console.log(
            `Device Admin: http://192.168.254.107:${PORT}/admin/order-monitor`
        );

        console.log(
            `Tablet Kiosk: http://192.168.254.107:${PORT}`
        );

        console.log(
            `Tablet POS:   http://192.168.254.107:${PORT}/pos`
        );


        console.log(
            `Tablet Queue: http://192.168.254.107:${PORT}/order-queue`
        );


        console.log("");

        console.log(
            `Health: http://192.168.254.107:${PORT}/health`
        );


        console.log("");

        console.log(
            "🔌 Socket.IO enabled"
        );

        console.log(
            "======================================"
        );

    }
);