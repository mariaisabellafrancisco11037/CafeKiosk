const jwt =
    require("jsonwebtoken");

const crypto =
    require("crypto");

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "cafekiosk-demo-secret";

const CAFE_ID =
    process.env.CAFE_ID ||
    "cafe-1";

const SESSION_SECONDS =
    8 * 60 * 60;


// =====================================================
// DEVELOPMENT ACCOUNTS
//
// For production, replace this with your users table +
// hashed passwords.
// =====================================================

function getAccounts() {
    return [
        {
            id:
                process.env.ADMIN_USER_ID ||
                "admin-1",

            username:
                process.env.ADMIN_USERNAME ||
                "admin",

            password:
                process.env.ADMIN_PASSWORD ||
                "admin123",

            role:
                "Admin",

            displayName:
                process.env.ADMIN_DISPLAY_NAME ||
                "Administrator"
        },

        {
            id:
                process.env.STAFF_USER_ID ||
                "staff-1",

            username:
                process.env.STAFF_USERNAME ||
                "staff",

            password:
                process.env.STAFF_PASSWORD ||
                "staff123",

            role:
                "Staff",

            displayName:
                process.env.STAFF_DISPLAY_NAME ||
                "Staff"
        }
    ];
}


// =====================================================
// CONSTANT-TIME STRING COMPARISON
// =====================================================

function safeEqual(a, b) {
    const left =
        Buffer.from(
            String(a)
        );

    const right =
        Buffer.from(
            String(b)
        );

    if (
        left.length !==
        right.length
    ) {
        return false;
    }

    return crypto
        .timingSafeEqual(
            left,
            right
        );
}


// =====================================================
// SET AUTH COOKIE
// =====================================================

function setAuthCookie(
    res,
    token
) {
    const secure =
        process.env.NODE_ENV ===
        "production"
            ? "; Secure"
            : "";

    res.setHeader(
        "Set-Cookie",
        [
            `cafe_token=${encodeURIComponent(token)}`,
            "HttpOnly",
            "SameSite=Lax",
            "Path=/",
            `Max-Age=${SESSION_SECONDS}`
        ].join("; ") +
        secure
    );
}


// =====================================================
// LOGIN
// =====================================================

exports.login =
    (req, res) => {

        const {
            username,
            password,
            role
        } = req.body;

        const requestedRole =
            String(
                role ||
                ""
            ).toLowerCase();

        const account =
            getAccounts()
                .find(
                    user =>
                        user.username
                            .toLowerCase() ===
                        String(
                            username
                        ).toLowerCase()
                );

        if (
            !account ||
            !safeEqual(
                password,
                account.password
            )
        ) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Invalid User ID or password."
                });
        }

        if (
            requestedRole &&
            account.role
                .toLowerCase() !==
            requestedRole
        ) {
            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        `This account is not a ${role} account.`
                });
        }

        const user = {
            userId:
                account.id,

            username:
                account.username,

            displayName:
                account.displayName,

            role:
                account.role,

            cafeId:
                CAFE_ID
        };

        const token =
            jwt.sign(
                user,
                JWT_SECRET,
                {
                    expiresIn:
                        SESSION_SECONDS
                }
            );

        setAuthCookie(
            res,
            token
        );

        return res
            .status(200)
            .json({
                success: true,
                message:
                    "Login successful.",
                token,
                user
            });
    };


// =====================================================
// CURRENT USER
// =====================================================

exports.me =
    (req, res) => {

        return res.json({
            success: true,
            user: req.user
        });
    };


// =====================================================
// LOGOUT
// =====================================================

exports.logout =
    (req, res) => {

        res.setHeader(
            "Set-Cookie",
            [
                "cafe_token=",
                "HttpOnly",
                "SameSite=Lax",
                "Path=/",
                "Max-Age=0"
            ].join("; ")
        );

        return res.json({
            success: true,
            message:
                "Logged out."
        });
    };
