const express = require("express");
const { getUserInfo, toggleAI, addWhatsAppNumber, deleteWhatsAppNumber, updateNumberSettings } = require("../controllers/userController");
const authenticateToken = require("../config/auth");

const router = express.Router();

router.get("/user-info", authenticateToken, getUserInfo);
router.post("/toggle-ai", authenticateToken, toggleAI);
router.post("/add-number", authenticateToken, addWhatsAppNumber);
router.delete("/delete-number/:numberId", authenticateToken, deleteWhatsAppNumber);
router.put("/update-number/:numberId", authenticateToken, updateNumberSettings); // ✅ ¡Ahora la función está definida correctamente!

module.exports = router;
