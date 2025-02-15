const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController"); // 👈 Verifica esta importación

const router = express.Router();

// Verifica que las funciones estén correctamente importadas
if (!registerUser || !loginUser) {
  console.error("❌ Error: No se importaron correctamente las funciones del authController.js");
}

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;
