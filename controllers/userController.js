const User = require("../models/User");
const clients = require("../WhatsappClients");

// ✅ Obtener información del usuario autenticado
exports.getUserInfo = async (req, res) => {
  try {
    if (!req.user || !req.user.username) {
      return res
        .status(403)
        .json({ message: "Acceso denegado. Usuario no autenticado." });
    }

    console.log("🔍 Buscando información del usuario:", req.user.username);

    const user = await User.findOne({ username: req.user.username }).select(
      "-password -token"
    );

    if (!user) {
      console.warn("⚠️ Usuario no encontrado en la base de datos.");
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    console.log("✅ Usuario encontrado:", user);
    res.json(user);
  } catch (error) {
    console.error("❌ Error en getUserInfo:", error);
    res
      .status(500)
      .json({
        message: "Error en el servidor al obtener la información del usuario.",
      });
  }
};

// ✅ Activar o desactivar IA para un número de WhatsApp
exports.toggleAI = async (req, res) => {
  const { number, enabled } = req.body;
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    const numberIndex = user.whatsappNumbers.findIndex(
      (n) => n.number === number
    );
    if (numberIndex === -1)
      return res.status(400).json({ message: "Número no encontrado" });

    user.whatsappNumbers[numberIndex].aiEnabled = enabled;
    await user.save();
    res.json({ success: true, aiEnabled: enabled });
  } catch (error) {
    res.status(500).json({ message: "Error actualizando la IA." });
  }
};

// ✅ Agregar un número de WhatsApp al usuario
exports.addWhatsAppNumber = async (req, res) => {
  const { number, name } = req.body;
  console.log("📥 Recibido en backend:", req.body);

  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    // 🔍 Verifica si el número ya existe
    const existingNumber = user.whatsappNumbers.find(
      (n) => n.number === number
    );
    if (existingNumber) {
      return res.status(400).json({ message: "Número ya registrado" });
    }

    // 🆕 Agregar nuevo número con un _id generado por MongoDB
    const newNumber = { number, name, aiEnabled: false };
    user.whatsappNumbers.push(newNumber);
    await user.save();

    // ✅ Recuperamos el _id recién generado desde la base de datos
    const addedNumber = user.whatsappNumbers.find((n) => n.number === number);

    console.log("✅ Número agregado correctamente:", addedNumber);

    res.json({ success: true, numberId: addedNumber._id }); // Enviar _id correcto
  } catch (error) {
    console.error("❌ Error en el backend:", error);
    res.status(500).json({ message: "Error agregando el número." });
  }
};

// ✅ Eliminar un número de WhatsApp del usuario
exports.deleteWhatsAppNumber = async (req, res) => {
  const { numberId } = req.params;
  console.log("Por aquí pasó el númeroId:", numberId);	
  
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    // Buscar el número en la base de datos por _id
    const newNumbers = user.whatsappNumbers.filter(
      (n) => n._id.toString() !== numberId
    );

    if (newNumbers.length === user.whatsappNumbers.length) {
      return res.status(400).json({ message: "Número no encontrado" });
    }
    if (clients[numberId]) {
      if (clients[numberId].puppeteer) {
        console.log("🔄 Cerrando Puppeteer antes de eliminar la sesión...");
        await clients[numberId].puppeteer.close();
      }
      await clients[numberId].destroy();
      delete clients[numberId];
    }
    await User.updateOne(
      { username: req.user.username },
      { $pull: { whatsappNumbers: { _id: numberId } } }
    );

    res.json({ success: true, message: "Número eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error eliminando número:", error);
    res.status(500).json({ message: "Error eliminando el número." });
  }
};

// ✅ Actualizar configuración de IA de un número
exports.updateNumberSettings = async (req, res) => {
  const { numberId } = req.params;
  const { aiEnabled, aiPrompt } = req.body;

  if (!numberId) {
    return res
      .status(400)
      .json({ message: "Error: numberId no proporcionado." });
  }

  try {
    const user = await User.findOne({ "whatsappNumbers._id": numberId });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const numberIndex = user.whatsappNumbers.findIndex(
      (n) => n._id.toString() === numberId
    );
    if (numberIndex === -1) {
      return res.status(400).json({ message: "Número no encontrado" });
    }

    if (aiEnabled !== undefined)
      user.whatsappNumbers[numberIndex].aiEnabled = aiEnabled;
    if (aiPrompt !== undefined)
      user.whatsappNumbers[numberIndex].aiPrompt = aiPrompt;

    await user.save();
    res.json({ success: true, message: "Configuración actualizada" });
  } catch (error) {
    console.error("❌ Error en el backend al actualizar configuración:", error);
    res
      .status(500)
      .json({
        message: "Error interno del servidor al actualizar configuración.",
      });
  }
};

// ✅ **Nuevo: Obtener todos los usuarios (solo admin)**
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // No enviar contraseñas
    res.json(users);
  } catch (error) {
    console.error("❌ Error obteniendo usuarios:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ✅ **Nuevo: Actualizar rol de usuario (solo admin)**
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Rol inválido." });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ Error actualizando rol:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
