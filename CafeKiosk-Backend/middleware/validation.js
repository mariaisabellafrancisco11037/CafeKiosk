exports.validateLogin =
    (req, res, next) => {

        const username =
            String(
                req.body?.username ??
                req.body?.userId ??
                ""
            ).trim();

        const password =
            String(
                req.body?.password ??
                ""
            );

        const requestedRole =
            String(
                req.body?.role ??
                ""
            ).trim();

        if (
            !username ||
            !password
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "User ID and password are required."
                });
        }

        if (
            username.length > 80 ||
            password.length > 128
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid login input."
                });
        }

        if (
            requestedRole &&
            ![
                "admin",
                "staff"
            ].includes(
                requestedRole
                    .toLowerCase()
            )
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid account role."
                });
        }

        req.body.username =
            username;

        req.body.password =
            password;

        req.body.role =
            requestedRole;

        next();
    };
