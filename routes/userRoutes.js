const express = require("express");
const { 
  getUserInfo, 
  toggleAI, 
  addWhatsAppNumber, 
  deleteWhatsAppNumber, 
  updateNumberSettings, 
  getAllUsers, 
  updateUserRole 
} = require("../controllers/userController");
const { authenticateToken, isAdmin } = require("../config/auth"); // ✅ Corrección aquí

const router = express.Router();

// 📌 Rutas accesibles para todos los usuarios autenticados
router.get("/user-info", authenticateToken, getUserInfo);
router.post("/toggle-ai", authenticateToken, toggleAI);
router.post("/add-number", authenticateToken, addWhatsAppNumber);
router.delete("/delete-number/:numberId", authenticateToken, deleteWhatsAppNumber);
router.put("/update-number/:numberId", authenticateToken, updateNumberSettings);

// 📌 Rutas solo para administradores
router.get("/admin/users", authenticateToken, isAdmin, getAllUsers); // ✅ Obtener lista de usuarios
router.put("/admin/update-role/:userId", authenticateToken, isAdmin, updateUserRole); // ✅ Actualizar roles de usuario

module.exports = router;
