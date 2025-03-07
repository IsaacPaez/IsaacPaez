const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const { authenticateToken } = require("../config/auth");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const clients = require("../WhatsappClients");
const router = express.Router();

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);

router.post("/logout", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(403).json({ message: "Acceso denegado. No hay token." });
  }

  const token = authHeader.split(" ")[1]; // Extrae el token de "Bearer <token>"

  if (!token) {
    return res
      .status(403)
      .json({ message: "Acceso denegado. Token no encontrado." });
  }

  console.log("🔑 Token recibido:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ username: decoded.username });

    if (!user) {
      return res
        .status(403)
        .json({ message: "Token inválido o usuario no autenticado." });
    }

    for (const numberData of user.whatsappNumbers) {
      const numberId = numberData._id.toString();

      if (clients[numberId]) {
        if (clients[numberId].puppeteer) {
          console.log("🔄 Cerrando Puppeteer antes de eliminar la sesión...");
          await clients[numberId].puppeteer.close();
          await clients[numberId].logout();
          await clients[numberId].destroy();
        }
        delete clients[numberId];
        console.log(`🔄 Sesión de WhatsApp eliminada para ${numberData.number}`);
      }
    }

    // Remove all WhatsApp numbers from the user
    await User.updateOne({ _id: user._id }, { $set: { whatsappNumbers: [] } });

    console.log("✅ Todos los números de WhatsApp eliminados.");
    res.json({ success: true, message: "Cierre de sesión exitoso" });
  } catch (error) {
    console.error("❌ Error en la verificación del token:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expirado. Por favor, inicia sesión de nuevo.",
      });
    }

    return res.status(403).json({ message: "Token inválido." });
  }
});

router.get("/me", authenticateToken, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

module.exports = router;
