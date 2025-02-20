const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authenticateToken(req, res, next) {
    console.log("🔍 Headers recibidos en la solicitud:", req.headers);

    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(403).json({ message: "Acceso denegado. No hay token." });
    }

    const token = authHeader.split(" ")[1]; // Extrae el token de "Bearer <token>"

    if (!token) {
        return res.status(403).json({ message: "Acceso denegado. Token no encontrado." });
    }

    console.log("🔑 Token recibido:", token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ username: decoded.username });

        if (!user) {
            return res.status(403).json({ message: "Token inválido o usuario no autenticado." });
        }

        req.user = user; // ✅ Agregar el usuario a la request para uso en controladores
        console.log("✅ Token verificado en la base de datos. Usuario autenticado:", user.username);
        next();
    } catch (error) {
        console.error("❌ Error en la verificación del token:", error.message);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expirado. Por favor, inicia sesión de nuevo." });
        }

        return res.status(403).json({ message: "Token inválido." });
    }
}

// ✅ Middleware para verificar si el usuario es admin
async function isAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Acceso denegado. No tienes permisos de administrador." });
    }
    next();
}

module.exports = { authenticateToken, isAdmin };
