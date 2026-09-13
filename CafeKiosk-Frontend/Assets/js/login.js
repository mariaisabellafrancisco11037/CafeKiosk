// ============================================================
// CAFEKIOSK - ADMIN / STAFF LOGIN
// Backend JWT authentication + Socket.IO presence
// ============================================================


// ============================================================
// CONFIG
// ============================================================

const LOGIN_CONFIG = {

    admin: {
        role:
            "Admin",

        redirect:
            "/admin/order-monitor"
    },

    staff: {
        role:
            "Staff",

        redirect:
            "/pos"
    }

};


const CAFE_ID =
    localStorage.getItem(
        "cafeId"
    ) ||
    "cafe-1";


// ============================================================
// BACKEND ORIGIN
//
// Works when the page is opened from:
// - http://localhost:5000
// - http://192.168.x.x:5000
// - VS Code Live Server on :5500
// ============================================================

function getBackendOrigin() {

    const protocol =
        window.location.protocol ===
        "https:"
            ? "https:"
            : "http:";

    const host =
        window.location.hostname ||
        "localhost";

    if (
        window.location.port ===
        "5000"
    ) {
        return window.location.origin;
    }

    return `${protocol}//${host}:5000`;
}


const API_ORIGIN =
    getBackendOrigin();


// ============================================================
// HELPERS
// ============================================================

function getFormRole(form) {

    return (
        form
            ?.closest(
                "[data-role]"
            )
            ?.dataset
            .role ||
        ""
    ).toLowerCase();
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

    element.textContent =
        text;

    element
        .classList
        .toggle(
            "success",
            success
        );
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
// SESSION STORAGE
// ============================================================

function saveSession(
    token,
    user
) {

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

        role:
            user.role,

        cafeId:
            user.cafeId ||
            CAFE_ID,

        loginAt:
            new Date()
                .toISOString()

    };


    localStorage.setItem(
        "cafeSession",
        JSON.stringify(
            session
        )
    );


    localStorage.setItem(
        "cafeAuthToken",
        token
    );


    localStorage.setItem(
        "cafeUserRole",
        user.role
    );


    localStorage.setItem(
        "cafeUserId",
        user.userId
    );


    localStorage.setItem(
        "cafeId",
        user.cafeId ||
        CAFE_ID
    );

}


// ============================================================
// LOAD SOCKET.IO CLIENT FROM YOUR NODE SERVER
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
                        "🔌 Login socket connected:",
                        socket.id
                    );


                    socket.emit(
                        "auth:join",
                        {
                            cafeId:
                                user.cafeId ||
                                CAFE_ID
                        },
                        response => {

                            if (
                                response?.success
                            ) {

                                console.log(
                                    "✅ Authenticated WebSocket:",
                                    response
                                );
                            }

                            finish();
                        }
                    );


                    // Do not delay redirect forever
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
                `${API_ORIGIN}/api/auth/login`,
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
                                config.role
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


        // Always redirect through the Node server.
        // This is important when login.html was opened from
        // VS Code Live Server (:5500).
        window.location.href =
            `${API_ORIGIN}${config.redirect}`;


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
// SHOW / HIDE PASSWORD
// ============================================================

document
    .querySelectorAll(
        "[data-password-target]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const input =
                        document
                            .getElementById(
                                button
                                    .dataset
                                    .passwordTarget
                            );


                    if (!input) {
                        return;
                    }


                    const showing =
                        input.type ===
                        "text";


                    input.type =
                        showing
                            ? "password"
                            : "text";


                    button.setAttribute(
                        "aria-label",
                        showing
                            ? "Show password"
                            : "Hide password"
                    );

                }
            );

        }
    );


// ============================================================
// FORGOT PASSWORD MODAL
// ============================================================

const forgotOverlay =
    document.getElementById(
        "forgotModal"
    );

const closeForgot =
    document.getElementById(
        "closeForgot"
    );

const forgotOk =
    document.getElementById(
        "forgotOk"
    );


function openForgotModal() {

    if (!forgotOverlay) {
        return;
    }

    forgotOverlay
        .classList
        .add(
            "show"
        );

    forgotOverlay
        .setAttribute(
            "aria-hidden",
            "false"
        );

}


function closeForgotModal() {

    if (!forgotOverlay) {
        return;
    }

    forgotOverlay
        .classList
        .remove(
            "show"
        );

    forgotOverlay
        .setAttribute(
            "aria-hidden",
            "true"
        );

}


document
    .querySelectorAll(
        "[data-forgot]"
    )
    .forEach(
        button =>
            button
                .addEventListener(
                    "click",
                    openForgotModal
                )
    );


closeForgot
    ?.addEventListener(
        "click",
        closeForgotModal
    );


forgotOk
    ?.addEventListener(
        "click",
        closeForgotModal
    );


forgotOverlay
    ?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                forgotOverlay
            ) {
                closeForgotModal();
            }

        }
    );


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {
            closeForgotModal();
        }

    }
);
