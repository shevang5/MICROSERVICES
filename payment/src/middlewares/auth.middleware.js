const jwt = require("jsonwebtoken");

function createAuthMiddleware(roles = ["user"]) {


    return function authMiddleware(req, res, next) {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            if (!roles.includes(decoded.role)) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            next();
        } catch (error) {
            return res.status(401).json({ message: "Unauthorized" });
        }
    }
}


module.exports = createAuthMiddleware;