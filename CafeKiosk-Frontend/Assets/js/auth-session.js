// ============================================================
// CAFEKIOSK - SHARED AUTHENTICATED SESSION
//
// Add this AFTER /socket.io/socket.io.js on Admin and POS pages:
// <script src="/socket.io/socket.io.js"></script>
// <script src="/Assets/js/auth-session.js"></script>
// ============================================================

(() => {

    function resolveApiOrigin() {

        const saved =
            localStorage.getItem(
                "cafeBackendUrl"
            );

        if (saved) {
            return saved.replace(
                /\/$/,
                ""
            );
        }

        if (
            window.location.port ===
            "5000"
        ) {
            return window.location.origin;
        }

        const protocol =
            window.location.protocol ===
            "https:"
                ? "https:"
                : "http:";

        const hostname =
            window.location.hostname ||
            "localhost";

        return `${protocol}//${hostname}:5000`;
    }


    const API_ORIGIN =
        resolveApiOrigin();


    function getLoginUrl() {

        if (
            window.location.port ===
            "5000"
        ) {
            return `${API_ORIGIN}/login`;
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

            return (
                `${prefix}/CafeKiosk-Frontend/Auth/login.html`
            );
        }

        return "/Auth/login.html";
    }

    const token =
        localStorage.getItem(
            "cafeAuthToken"
        );

    const session =
        (() => {

            try {
                return JSON.parse(
                    localStorage.getItem(
                        "cafeSession"
                    ) ||
                    "null"
                );

            } catch {
                return null;
            }

        })();


    function clearClientSession() {

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

            await fetch(
                `${API_ORIGIN}/api/auth/logout`,
                {
                    method:
                        "POST",

                    credentials:
                        "include",

                    headers:
                        token
                            ? {
                                Authorization:
                                    `Bearer ${token}`
                            }
                            : {}
                }
            );

        } catch (error) {

            console.warn(
                "Logout request failed:",
                error
            );

        } finally {

            clearClientSession();

            window.location.href =
                getLoginUrl();
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

            await logout();

            throw new Error(
                "Session expired."
            );
        }


        return response;
    }


    async function verifySession() {

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


            return data.user;

        } catch (error) {

            console.error(
                "Session verification failed:",
                error
            );

            clearClientSession();

            window.location.href =
                getLoginUrl();

            return null;
        }
    }


    function connectSocket() {

        if (
            typeof window.io !==
            "function"
        ) {

            console.warn(
                "Socket.IO client is not loaded."
            );

            return null;
        }


        const socket =
            window.io(
                API_ORIGIN,
                {

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
                            localStorage
                                .getItem(
                                    "cafeId"
                                ) ||
                            "cafe-1"
                    }
                );

            }
        );


        socket.on(
            "auth:force-logout",
            async () => {

                await logout();

            }
        );


        return socket;
    }


    const socket =
        connectSocket();


    window.CafeAuth = {

        token,

        session,

        socket,

        apiFetch,

        verifySession,

        logout

    };


    verifySession()
        .then(
            user => {

                if (user) {

                    window.dispatchEvent(
                        new CustomEvent(
                            "cafe:auth-ready",
                            {
                                detail:
                                    user
                            }
                        )
                    );

                }

            }
        );

})();
