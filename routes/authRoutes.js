const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const { authenticateToken } = require("../config/auth"); // ✅ Corrige la importación

const router = express.Router();

// 🔍 Verificar si las funciones están correctamente importadas
if (!registerUser || !loginUser) {
  console.error("❌ Error: No se importaron correctamente las funciones del authController.js");
}

// 📌 Rutas de autenticación
router.post("/register", registerUser);
router.post("/login", loginUser);

// ✅ Ruta protegida para obtener información del usuario autenticado
router.get("/me", authenticateToken, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

module.exports = router;
