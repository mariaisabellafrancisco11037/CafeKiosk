// ============================================================
// CAFEKIOSK - SHARED AUTH SESSION
// SIMULTANEOUS ADMIN + STAFF LOGIN FIX
//
// Admin keys:
//   cafeAdminAuthToken
//   cafeAdminSession
//
// Staff keys:
//   cafeStaffAuthToken
//   cafeStaffSession
//
// Each browser tab also keeps an active role in sessionStorage.
// ============================================================

(() => {

    const ROLE_CONFIG = {

        admin: {
            tokenKey:
                "cafeAdminAuthToken",

            sessionKey:
                "cafeAdminSession"
        },

        manager: {
            tokenKey:
                "cafeManagerAuthToken",

            sessionKey:
                "cafeManagerSession"
        },

        staff: {
            tokenKey:
                "cafeStaffAuthToken",

            sessionKey:
                "cafeStaffSession"
        }

    };


    function resolveApiOrigin() {
        if (window.location.protocol === "http:" || window.location.protocol === "https:") {
            if (window.location.port === "5000") return window.location.origin;
            return `${window.location.protocol}//${window.location.hostname}:5000`;
        }
        const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
        if (saved) return saved.replace(/\/$/, "");
        return "http://127.0.0.1:5000";
    }


    const API_ORIGIN =
        resolveApiOrigin();


    function parseSession(
        key
    ) {

        try {

            return JSON.parse(
                localStorage.getItem(
                    key
                ) ||
                "null"
            );

        } catch {

            return null;

        }
    }


    function hasRoleSession(
        role
    ) {

        const config =
            ROLE_CONFIG[
                role
            ];

        if (!config) {
            return false;
        }


        return Boolean(
            localStorage.getItem(
                config.tokenKey
            )
        );

    }


    function pageRolePreference() {

        const path =
            String(
                window.location.pathname ||
                ""
            )
                .toLowerCase();


        // Admin pages MUST use the Admin session.
        if (
            path.includes(
                "/admin/"
            ) ||
            path.includes(
                "/admin-"
            )
        ) {
            return "admin";
        }


        // Manager pages MUST use the Manager session.
        if (
            path.includes(
                "/manager/"
            ) ||
            path.includes(
                "manager-dashboard"
            ) ||
            path.includes(
                "manager-pos"
            ) ||
            path.includes(
                "manager-order-queue"
            )
        ) {
            return "manager";
        }


        // POS / Order Queue should normally use Staff.
        // If no Staff session exists, Admin may still access these pages.
        if (
            path.includes(
                "/pos/"
            ) ||
            path.endsWith(
                "/pos"
            ) ||
            path.includes(
                "order-queue"
            ) ||
            path.includes(
                "staff-dashboard"
            )
        ) {

            const tabRole = String(sessionStorage.getItem("cafeActiveRole") || "").toLowerCase();

            if (
                ["staff", "manager", "admin"].includes(tabRole) &&
                hasRoleSession(tabRole)
            ) {
                return tabRole;
            }

            if (
                hasRoleSession(
                    "staff"
                )
            ) {
                return "staff";
            }

            if (
                hasRoleSession(
                    "manager"
                )
            ) {
                return "manager";
            }

            if (
                hasRoleSession(
                    "admin"
                )
            ) {
                return "admin";
            }

            return "staff";
        }


        const tabRole =
            String(
                sessionStorage.getItem(
                    "cafeActiveRole"
                ) ||
                ""
            )
                .toLowerCase();


        if (
            ROLE_CONFIG[
                tabRole
            ]
        ) {
            return tabRole;
        }


        if (
            hasRoleSession(
                "admin"
            )
        ) {
            return "admin";
        }


        if (
            hasRoleSession(
                "manager"
            )
        ) {
            return "manager";
        }

        if (
            hasRoleSession(
                "staff"
            )
        ) {
            return "staff";
        }


        return "";
    }


    const activeRole =
        pageRolePreference();


    const activeConfig =
        ROLE_CONFIG[
            activeRole
        ] ||
        null;


    let token =
        activeConfig
            ? (
                sessionStorage.getItem(
                    "cafeAuthToken"
                ) &&
                String(
                    sessionStorage.getItem(
                        "cafeActiveRole"
                    ) ||
                    ""
                ).toLowerCase() ===
                    activeRole
                    ? sessionStorage.getItem(
                        "cafeAuthToken"
                    )
                    : localStorage.getItem(
                        activeConfig.tokenKey
                    )
            )
            : null;


    const session =
        activeConfig
            ? (
                (() => {

                    try {

                        const tabRole =
                            String(
                                sessionStorage.getItem(
                                    "cafeActiveRole"
                                ) ||
                                ""
                            ).toLowerCase();


                        if (
                            tabRole ===
                            activeRole
                        ) {

                            const tabSession =
                                JSON.parse(
                                    sessionStorage.getItem(
                                        "cafeSession"
                                    ) ||
                                    "null"
                                );


                            if (tabSession) {
                                return tabSession;
                            }

                        }

                    } catch {
                        // Fall through to the persistent role session.
                    }


                    return parseSession(
                        activeConfig.sessionKey
                    );

                })()
            )
            : null;


    function getLoginUrl(
        role =
            activeRole
    ) {

        const rolePath =
            role ===
            "admin"
                ? "admin-login"
                : role ===
                    "manager"
                    ? "manager-login"
                    : role ===
                        "staff"
                        ? "staff-login"
                        : "login";


        if (
            window.location.port ===
            "5000"
        ) {
            return (
                `${API_ORIGIN}/${rolePath}`
            );
        }


        const marker =
            "/CafeKiosk-Frontend/";

        const path =
            window.location.pathname ||
            "";

        const markerIndex =
            path.indexOf(
                marker
            );


        if (
            markerIndex !== -1
        ) {

            const prefix =
                path.slice(
                    0,
                    markerIndex
                );

            const fileName =
                role ===
                "admin"
                    ? "admin-login.php"
                    : role ===
                        "manager"
                        ? "manager-login.php"
                        : role ===
                            "staff"
                            ? "staff-login.php"
                            : "login.php";


            return (
                `${prefix}/CafeKiosk-Frontend/Auth/${fileName}`
            );
        }


        if (
            role ===
            "admin"
        ) {
            return "/Auth/admin-login.php";
        }


        if (
            role ===
            "manager"
        ) {
            return "/Auth/manager-login.php";
        }

        if (
            role ===
            "staff"
        ) {
            return "/Auth/staff-login.php";
        }


        return "/Auth/login.php";
    }


    function clearClientSession(
        role =
            activeRole
    ) {

        const config =
            ROLE_CONFIG[
                role
            ];


        if (config) {

            // Only remove this role.
            // Do NOT remove the other role's session.
            localStorage.removeItem(
                config.tokenKey
            );

            localStorage.removeItem(
                config.sessionKey
            );

        }


        const tabRole =
            String(
                sessionStorage.getItem(
                    "cafeActiveRole"
                ) ||
                ""
            ).toLowerCase();


        if (
            !role ||
            tabRole ===
                role
        ) {

            sessionStorage.removeItem(
                "cafeActiveRole"
            );

            sessionStorage.removeItem(
                "cafeAuthToken"
            );

            sessionStorage.removeItem(
                "cafeSession"
            );

        }


        // Clean obsolete shared keys from the old implementation.
        // Never use these for current role selection.
        localStorage.removeItem(
            "cafeAuthToken"
        );

        localStorage.removeItem(
            "cafeSession"
        );

        localStorage.removeItem(
            "cafeUserRole"
        );

        localStorage.removeItem(
            "cafeUserId"
        );

    }


    async function logout() {

        try {

            if (token) {

                await fetch(
                    `${API_ORIGIN}/api/auth/logout`,
                    {
                        method:
                            "POST",

                        credentials:
                            "include",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                role:
                                    session?.role ||
                                    activeRole
                            })
                    }
                );

            }

        } catch (error) {

            console.warn(
                "Logout request failed:",
                error
            );

        } finally {

            // Critical: clear ONLY the role used by this page.
            clearClientSession(
                activeRole
            );


            window.location.href =
                getLoginUrl(
                    activeRole
                );

        }

    }


    async function apiFetch(
        url,
        options = {}
    ) {

        const headers =
            new Headers(
                options.headers ||
                {}
            );


        if (token) {

            headers.set(
                "Authorization",
                `Bearer ${token}`
            );

        }


        const response =
            await fetch(
                url,
                {
                    ...options,

                    credentials:
                        "include",

                    headers
                }
            );


        if (
            response.status ===
            401
        ) {

            // A 401 on Admin only logs out Admin.
            // A 401 on Staff only logs out Staff.
            await logout();


            throw new Error(
                "Session expired."
            );

        }


        return response;
    }


    async function verifySession() {

        if (
            !activeRole ||
            !token
        ) {

            window.location.href =
                getLoginUrl(
                    activeRole
                );

            return null;
        }


        try {

            const response =
                await apiFetch(
                    `${API_ORIGIN}/api/auth/me`
                );


            if (!response.ok) {

                throw new Error(
                    "Not authenticated."
                );

            }


            const data =
                await response.json();


            const returnedRole =
                String(
                    data.user?.role ||
                    ""
                )
                    .toLowerCase();


            // Admin page may only keep an Admin session.
            if (
                activeRole ===
                    "admin" &&
                returnedRole !==
                    "admin"
            ) {

                throw new Error(
                    "Admin session required."
                );

            }


            // Staff/POS page accepts Staff or Admin.
            if (
                activeRole ===
                    "staff" &&
                ![
                    "staff",
                    "admin"
                ].includes(
                    returnedRole
                )
            ) {

                throw new Error(
                    "Staff session required."
                );

            }


            return data.user;


        } catch (error) {

            console.error(
                "Session verification failed:",
                error
            );


            clearClientSession(
                activeRole
            );


            window.location.href =
                getLoginUrl(
                    activeRole
                );


            return null;

        }

    }


    function connectSocketNow() {

        if (
            typeof window.io !==
            "function"
        ) {

            console.warn(
                "Socket.IO client is not loaded."
            );

            return null;
        }


        if (!token) {

            console.warn(
                "Authenticated socket was not started because this page has no role token."
            );

            return null;
        }


        const socket =
            window.io(
                API_ORIGIN,
                {

                    // Explicit role-specific token means two tabs can have
                    // two independent authenticated sockets at the same time.
                    auth: {
                        token
                    },

                    withCredentials:
                        true,

                    reconnection:
                        true,

                    reconnectionAttempts:
                        Infinity,

                    reconnectionDelay:
                        700,

                    reconnectionDelayMax:
                        5000

                }
            );


        socket.on(
            "connect",
            () => {

                socket.emit(
                    "auth:join",
                    {
                        cafeId:
                            session?.cafeId ||
                            localStorage.getItem(
                                "cafeId"
                            ) ||
                            "cafe-1"
                    }
                );

            }
        );


        socket.on(
            "auth:force-logout",
            async payload => {

                const targetRole =
                    String(
                        payload?.role ||
                        ""
                    )
                        .toLowerCase();


                // Ignore a force-logout intended for the other role.
                if (
                    targetRole &&
                    targetRole !==
                        activeRole
                ) {
                    return;
                }


                await logout();

            }
        );


        return socket;
    }


    function loadSocketClient() {
        return new Promise((resolve, reject) => {
            if (typeof window.io === "function") {
                resolve();
                return;
            }

            const existing = document.querySelector('script[data-cafekiosk-auth-socket]');
            if (existing) {
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = `${API_ORIGIN}/socket.io/socket.io.js`;
            script.async = true;
            script.dataset.cafekioskAuthSocket = "true";
            script.onload = resolve;
            script.onerror = () => reject(new Error("Socket.IO client failed to load."));
            document.head.appendChild(script);
        });
    }

    async function startSocket() {
        if (!token) return null;
        try {
            await loadSocketClient();
            const socket = connectSocketNow();
            if (window.CafeAuth) window.CafeAuth.socket = socket;
            return socket;
        } catch (error) {
            console.warn("Authenticated realtime connection unavailable:", error);
            return null;
        }
    }

    // Keep account status synchronized even if the realtime connection is
    // interrupted. A deactivated account is removed from the page within a
    // few seconds and its role-specific token is cleared.
    let accountCheckBusy = false;
    async function checkAccountStatus() {
        if (!token || accountCheckBusy || document.hidden) return;
        accountCheckBusy = true;
        try {
            const response = await fetch(`${API_ORIGIN}/api/auth/me`, {
                credentials: "include",
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store"
            });
            if (response.status === 401 || response.status === 403) {
                const payload = await response.json().catch(() => ({}));
                if (payload?.code === "ACCOUNT_INACTIVE" || response.status === 401) {
                    alert(payload?.message || "Your CafeKiosk account is no longer active.");
                    clearClientSession(activeRole);
                    window.location.href = getLoginUrl(activeRole);
                }
            }
        } catch (_) {
            // Network interruptions should not log the user out.
        } finally {
            accountCheckBusy = false;
        }
    }

    function replaceToken(newToken) {
        const nextToken = String(newToken || "").trim();
        if (!nextToken || !activeConfig) return false;
        token = nextToken;
        localStorage.setItem(activeConfig.tokenKey, nextToken);
        sessionStorage.setItem("cafeAuthToken", nextToken);
        sessionStorage.setItem("cafeActiveRole", activeRole);
        if (window.CafeAuth) window.CafeAuth.token = nextToken;

        if (window.CafeAuth?.socket) {
            try { window.CafeAuth.socket.disconnect(); } catch (_) {}
            window.CafeAuth.socket = null;
        }
        startSocket();
        return true;
    }


    window.CafeAuth = {

        role:
            activeRole,

        token,

        session,

        socket: null,

        apiFetch,

        verifySession,

        logout,

        clearClientSession,

        replaceToken,

        API_ORIGIN

    };

    startSocket();
    setTimeout(checkAccountStatus, 1200);
    setInterval(checkAccountStatus, 10000);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkAccountStatus();
    });

})();
