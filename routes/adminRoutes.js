const express = require("express");
const { authenticateToken, isAdmin } = require("../config/auth");
const {
  getAgents,
  addAgent,
  changeUserPassword,
  deactivateUser,
  deleteUser,
  updateUserTokens,
} = require("../controllers/adminController");
const { getAllUsers } = require("../controllers/userController");
const upload = require("../middlewares/upload"); // ✅ Importa el middleware de subida

const router = express.Router();

// ✅ Ruta para obtener todos los usuarios (debe coincidir con "/api/admin/users")
router.get("/users", authenticateToken, isAdmin, getAllUsers);

// ✅ Ruta para obtener todos los agentes IA (debe coincidir con "/api/admin/agents")
router.get("/agents", authenticateToken, getAgents);

// ✅ Ruta para agregar un nuevo agente IA
router.post(
  "/add-agent",
  authenticateToken,
  isAdmin,
  upload.single("image"),
  addAgent
);
router.post("/reset-password", authenticateToken, isAdmin, changeUserPassword);

router.post("/deactivate-user/:id", authenticateToken, isAdmin, deactivateUser);

router.delete("/delete-user/:id", authenticateToken, isAdmin, deleteUser);

router.put("/update-user-tokens", authenticateToken, isAdmin, updateUserTokens);

module.exports = router;
