// ============================================================
// CAFEKIOSK - ADMIN / STAFF LOGIN
// SIMULTANEOUS SESSION FIX
//
// Admin and Staff are stored separately.
// Logging in one role no longer overwrites the other role.
// ============================================================


// ============================================================
// CONFIG
// ============================================================

const LOGIN_CONFIG = {

    admin: {
        role:
            "Admin",

        redirect:
            "/Admin/dashboard.php",

        tokenKey:
            "cafeAdminAuthToken",

        sessionKey:
            "cafeAdminSession"
    },

    manager: {
        role:
            "Manager",

        redirect:
            "/manager-dashboard",

        tokenKey:
            "cafeManagerAuthToken",

        sessionKey:
            "cafeManagerSession"
    },

    staff: {
        role:
            "Staff",

        redirect:
            "/staff-dashboard",

        tokenKey:
            "cafeStaffAuthToken",

        sessionKey:
            "cafeStaffSession"
    }

};


const CAFE_ID =
    localStorage.getItem(
        "cafeId"
    ) ||
    "cafe-1";


// ============================================================
// BACKEND ORIGIN
// ============================================================

function getBackendOrigin() {
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
    getBackendOrigin();


// ============================================================
// FRONTEND ROUTING
// ============================================================

function getFrontendBasePath() {

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
            `${prefix}/CafeKiosk-Frontend`
        );
    }


    return "";
}


function getRoleRedirect(
    formRole,
    backendRedirect
) {

    if (
        window.location.port ===
        "5000"
    ) {
        return (
            `${API_ORIGIN}${backendRedirect}`
        );
    }


    const frontendBase =
        getFrontendBasePath();


    if (
        formRole ===
        "admin"
    ) {
        return (
            `${frontendBase}/Admin/dashboard.php`
        );
    }

    if (
        formRole ===
        "manager"
    ) {
        return (
            `${frontendBase}/Manager/dashboard.php`
        );
    }


    return (
        `${frontendBase}/POS/staff-dashboard.php`
    );
}


// ============================================================
// HELPERS
// ============================================================

function getFormRole(form) {

    // The login page itself is the authority for the role.
    // If Staff was selected, staff-login.php has data-role="Staff".
    // If Admin was selected, admin-login.php has data-role="Admin".
    const pageRole =
        String(
            document.body?.dataset?.role ||
            form?.closest("[data-role]")?.dataset?.role ||
            sessionStorage.getItem("cafeSelectedLoginRole") ||
            ""
        )
            .trim()
            .toLowerCase();

    return pageRole;
}



function showMessage(
    role,
    text,
    success = false
) {

    const element =
        document.getElementById(
            `${role}LoginMessage`
        );


    if (!element) {
        return;
    }


    const transient = /connecting|logging in|redirecting/i.test(String(text || ""));

    if (!transient && text && window.CafeMessageDialog) {
        element.textContent = "";
        element.classList.remove("success");
        window.CafeMessageDialog.show(text, {
            type: success ? "success" : "error",
            title: success ? "Login Successful" : "Login Message"
        });
        return;
    }

    element.textContent = text;
    element.classList.toggle("success", success);
}


function setSubmitting(
    form,
    submitting
) {

    const button =
        form.querySelector(
            '.login-button[type="submit"], .login-button'
        );


    if (!button) {
        return;
    }


    button.disabled =
        submitting;


    button.textContent =
        submitting
            ? "LOGGING IN..."
            : "LOG IN";
}


// ============================================================
// ROLE-SPECIFIC SESSION STORAGE
// ============================================================

function saveSession(
    token,
    user
) {

    const role =
        String(
            user.role ||
            ""
        )
            .trim()
            .toLowerCase();

    const config =
        LOGIN_CONFIG[
            role
        ];


    if (!config) {
        throw new Error(
            "Unknown account role."
        );
    }


    const session = {

        loggedIn:
            true,

        token,

        userId:
            user.userId,

        username:
            user.username,

        displayName:
            user.displayName,

        email:
            user.email || "",

        phone:
            user.phone || "",

        isOwner:
            Boolean(user.isOwner),

        role:
            user.role,

        cafeId:
            user.cafeId ||
            CAFE_ID,

        cafeName:
            user.cafeName ||
            '',

        loginAt:
            new Date()
                .toISOString()

    };


    // Persistent role-specific copies.
    // Admin and Staff no longer write to the same keys.
    localStorage.setItem(
        config.sessionKey,
        JSON.stringify(
            session
        )
    );


    localStorage.setItem(
        config.tokenKey,
        token
    );


    localStorage.setItem(
        "cafeId",
        user.cafeId ||
        CAFE_ID
    );

    if (user.cafeName) {
        localStorage.setItem("cafeName", user.cafeName);
    }


    // Tab-specific active session.
    // Different tabs may therefore remain Admin and Staff at the same time.
    sessionStorage.setItem(
        "cafeActiveRole",
        role
    );


    sessionStorage.setItem(
        "cafeAuthToken",
        token
    );


    sessionStorage.setItem(
        "cafeSession",
        JSON.stringify(
            session
        )
    );


    // Remove obsolete shared localStorage values from the old login system.
    // These old keys caused the second login to overwrite the first login.
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


// ============================================================
// LOAD SOCKET.IO CLIENT
// ============================================================

function loadSocketClient() {

    if (
        typeof window.io ===
        "function"
    ) {
        return Promise.resolve();
    }


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const existing =
                document.querySelector(
                    'script[data-cafekiosk-socket]'
                );


            if (existing) {

                existing.addEventListener(
                    "load",
                    resolve,
                    {
                        once: true
                    }
                );

                existing.addEventListener(
                    "error",
                    reject,
                    {
                        once: true
                    }
                );

                return;
            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                `${API_ORIGIN}/socket.io/socket.io.js`;


            script.dataset
                .cafekioskSocket =
                "true";


            script.onload =
                resolve;


            script.onerror =
                () =>
                    reject(
                        new Error(
                            "Unable to load Socket.IO."
                        )
                    );


            document.head
                .appendChild(
                    script
                );

        }
    );
}


// ============================================================
// AUTHENTICATED SOCKET CONNECTION
// ============================================================

async function connectLoginSocket(
    token,
    user
) {

    try {

        await loadSocketClient();

    } catch (error) {

        console.warn(
            "Socket.IO client could not be loaded:",
            error
        );

        return null;
    }


    if (
        typeof window.io !==
        "function"
    ) {
        return null;
    }


    return new Promise(
        resolve => {

            let finished =
                false;


            const socket =
                window.io(
                    API_ORIGIN,
                    {

                        // Explicit token is critical:
                        // this socket keeps its own Admin/Staff identity.
                        auth: {
                            token
                        },

                        withCredentials:
                            true,

                        reconnection:
                            true,

                        reconnectionAttempts:
                            10,

                        reconnectionDelay:
                            700,

                        timeout:
                            5000
                    }
                );


            const finish =
                () => {

                    if (finished) {
                        return;
                    }

                    finished =
                        true;

                    resolve(
                        socket
                    );

                };


            socket.on(
                "connect",
                () => {

                    console.log(
                        `🔌 ${user.role} login socket connected:`,
                        socket.id
                    );


                    socket.emit(
                        "auth:join",
                        {
                            cafeId:
                                user.cafeId ||
                                CAFE_ID
                        },

                        () => {
                            finish();
                        }
                    );


                    setTimeout(
                        finish,
                        350
                    );

                }
            );


            socket.on(
                "connect_error",
                error => {

                    console.warn(
                        "Login WebSocket connection failed:",
                        error.message
                    );

                    finish();
                }
            );


            setTimeout(
                finish,
                1800
            );

        }
    );
}


// ============================================================
// ROLE-SPECIFIC AUTH ENDPOINT
// ============================================================

function getLoginEndpoint(formRole) {

    if (formRole === "staff") {
        return `${API_ORIGIN}/api/auth/staff-login`;
    }

    if (formRole === "admin") {
        return `${API_ORIGIN}/api/auth/admin-login`;
    }

    if (formRole === "manager") {
        return `${API_ORIGIN}/api/auth/manager-login`;
    }

    return `${API_ORIGIN}/api/auth/login`;
}


// ============================================================
// LOGIN
// ============================================================

async function handleLogin(
    form
) {

    const formRole =
        getFormRole(
            form
        );


    const config =
        LOGIN_CONFIG[
            formRole
        ];


    if (!config) {

        console.error(
            "Unknown login role:",
            formRole
        );

        return;
    }


    const userId =
        String(
            form.elements
                .userId
                .value ||
            ""
        ).trim();


    const password =
        String(
            form.elements
                .password
                .value ||
            ""
        );


    if (
        !userId ||
        !password
    ) {

        showMessage(
            formRole,
            "Please enter your User ID and password."
        );

        return;
    }


    setSubmitting(
        form,
        true
    );


    showMessage(
        formRole,
        "Connecting to CafeKiosk..."
    );


    try {

        const response =
            await fetch(
                getLoginEndpoint(formRole),
                {

                    method:
                        "POST",

                    credentials:
                        "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            username:
                                userId,

                            password,

                            role:
                                config.role,

                            cafeId:
                                CAFE_ID
                        })

                }
            );


        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );


        if (
            !response.ok
        ) {

            throw new Error(
                data.message ||
                "Unable to log in."
            );
        }


        if (
            !data.token ||
            !data.user
        ) {

            throw new Error(
                "The server returned an invalid login response."
            );
        }


        if (
            String(
                data.user.role ||
                ""
            ).toLowerCase() !==
            config.role
                .toLowerCase()
        ) {

            throw new Error(
                `This account cannot access the ${config.role} page.`
            );
        }


        saveSession(
            data.token,
            data.user
        );


        // Keep the tab role explicit. This prevents an existing Admin
        // session from being mistaken for a Staff login, and vice versa.
        sessionStorage.setItem(
            "cafeSelectedLoginRole",
            formRole
        );


        showMessage(
            formRole,
            "Login successful. Connecting...",
            true
        );


        await connectLoginSocket(
            data.token,
            data.user
        );


        showMessage(
            formRole,
            "Login successful. Redirecting...",
            true
        );


        window.location.href =
            getRoleRedirect(
                formRole,
                config.redirect
            );


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        showMessage(
            formRole,
            error.message ||
            "Unable to connect to the server."
        );


        setSubmitting(
            form,
            false
        );

    }

}


// ============================================================
// FORM EVENTS
// ============================================================

document
    .querySelectorAll(
        ".login-form"
    )
    .forEach(
        form => {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    handleLogin(
                        form
                    );

                }
            );

        }
    );


// ============================================================
// PASSWORD VISIBILITY
// ============================================================

document
    .querySelectorAll(
        ".password-toggle"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const wrapper =
                        button.closest(
                            ".password-field"
                        ) ||
                        button.parentElement;

                    const input =
                        wrapper
                            ?.querySelector(
                                'input[type="password"], input[type="text"]'
                            );


                    if (!input) {
                        return;
                    }


                    const show =
                        input.type ===
                        "password";

                    input.type =
                        show
                            ? "text"
                            : "password";

                    button.setAttribute(
                        "aria-pressed",
                        String(
                            show
                        )
                    );

                }
            );

        }
    );
