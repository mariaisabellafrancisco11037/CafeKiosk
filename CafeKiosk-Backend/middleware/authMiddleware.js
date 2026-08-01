const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(403).json({ message: "No token provided" });
    }

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user.role !== "Admin") {
        return res.status(403).json({ message: "Admin only access" });
    }
    next();
};