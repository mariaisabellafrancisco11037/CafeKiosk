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
            const port = window.location.port;
            if (!port || port === "80" || port === "443" || port === "5000") return window.location.origin;
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


    // ============================================================
    // TENANT / CAFE IDENTITY
    // Every authenticated Admin, Manager and Staff page gets a persistent
    // cafe-name badge so users can immediately see which cafe account they
    // are working in. The browser title also includes the registered cafe.
    // ============================================================

    function saveResolvedProfile(user) {
        if (!user || !activeConfig) return;
        const current = parseSession(activeConfig.sessionKey) || {};
        const merged = { ...current, ...user, loggedIn: true, token: token || current.token || '' };
        localStorage.setItem(activeConfig.sessionKey, JSON.stringify(merged));
        sessionStorage.setItem('cafeSession', JSON.stringify(merged));
        if (user.cafeId) localStorage.setItem('cafeId', user.cafeId);
        if (user.cafeName) localStorage.setItem('cafeName', user.cafeName);
    }

    function installCafeIdentityStyles() {
        if (document.getElementById('cafekioskCafeIdentityStyles')) return;
        const style = document.createElement('style');
        style.id = 'cafekioskCafeIdentityStyles';
        style.textContent = `
          .cafekiosk-cafe-identity{position:fixed;left:18px;bottom:16px;z-index:1100;display:flex;align-items:center;gap:8px;max-width:min(320px,calc(100vw - 36px));padding:8px 11px;border:1px solid rgba(82,119,94,.24);border-radius:999px;background:rgba(255,252,246,.96);box-shadow:0 8px 24px rgba(66,48,34,.12);backdrop-filter:blur(8px);color:#4a392d;font:700 11px/1.2 "Segoe UI",Arial,sans-serif}
          .cafekiosk-cafe-identity .ck-cafe-dot{width:8px;height:8px;border-radius:50%;background:#4f9872;box-shadow:0 0 0 3px rgba(79,152,114,.12);flex:0 0 auto}
          .cafekiosk-cafe-identity .ck-cafe-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .cafekiosk-cafe-identity .ck-cafe-role{color:#8a7562;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
          @media(max-width:700px){.cafekiosk-cafe-identity{left:10px;bottom:10px;max-width:calc(100vw - 20px);padding:7px 10px}.cafekiosk-cafe-identity .ck-cafe-role{display:none}}
        `;
        document.head.appendChild(style);
    }

    function renderCafeIdentity(user) {
        const cafeName = String(user?.cafeName || session?.cafeName || localStorage.getItem('cafeName') || '').trim();
        if (!cafeName) return;
        const role = String(user?.role || session?.role || activeRole || '').trim();

        const doRender = () => {
            if (!document.body) return;
            installCafeIdentityStyles();
            let badge = document.getElementById('cafekioskCafeIdentity');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'cafekioskCafeIdentity';
                badge.className = 'cafekiosk-cafe-identity';
                badge.setAttribute('aria-label', 'Current cafe account');
                document.body.appendChild(badge);
            }
            badge.innerHTML = `<span class="ck-cafe-dot" aria-hidden="true"></span><span class="ck-cafe-name"></span><span class="ck-cafe-role"></span>`;
            badge.querySelector('.ck-cafe-name').textContent = cafeName;
            badge.querySelector('.ck-cafe-role').textContent = role || 'Account';
            document.querySelectorAll('[data-cafe-identity]').forEach(el => { el.textContent = cafeName; });

            const pageTitle = String(document.title || 'CafeKiosk').replace(/^.*?\s[•|-]\sCafeKiosk\s[•|-]\s/i, '');
            if (!document.title.includes(cafeName)) {
                document.title = `${cafeName} • ${pageTitle || 'CafeKiosk'}`;
            }
        };

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', doRender, { once: true });
        else doRender();
    }

    async function refreshCafeIdentity() {
        if (!activeRole) return null;
        try {
            const headers = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            const response = await fetch(`${API_ORIGIN}/api/auth/me`, { credentials: 'include', headers, cache: 'no-store' });
            if (!response.ok) return null;
            const data = await response.json().catch(() => ({}));
            if (data?.user) {
                saveResolvedProfile(data.user);
                renderCafeIdentity(data.user);
                window.dispatchEvent(new CustomEvent('cafekiosk:identity', { detail: data.user }));
                return data.user;
            }
        } catch (error) {
            console.warn('Cafe identity could not be refreshed:', error.message);
        }
        return null;
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

        refreshCafeIdentity,
        renderCafeIdentity,

        API_ORIGIN

    };

    renderCafeIdentity(session);
    refreshCafeIdentity();
    startSocket();
    setTimeout(checkAccountStatus, 1200);
    setInterval(checkAccountStatus, 10000);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkAccountStatus();
    });

})();
