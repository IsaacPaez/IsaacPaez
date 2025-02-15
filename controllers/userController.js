const User = require("../models/User");

exports.getUserInfo = async (req, res) => {
    try {
      if (!req.user || !req.user.username) {
        return res.status(403).json({ message: "Acceso denegado. Usuario no autenticado." });
      }
  
      console.log("🔍 Buscando información del usuario:", req.user.username);
  
      const user = await User.findOne({ username: req.user.username }).select("-password -token");
  
      if (!user) {
        console.warn("⚠️ Usuario no encontrado en la base de datos.");
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
  
      console.log("✅ Usuario encontrado:", user);
      res.json(user);
    } catch (error) {
      console.error("❌ Error en getUserInfo:", error);
      res.status(500).json({ message: "Error en el servidor al obtener la información del usuario." });
    }
  };
  

exports.toggleAI = async (req, res) => {
  const { number, enabled } = req.body;
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const numberIndex = user.whatsappNumbers.findIndex((n) => n.number === number);
    if (numberIndex === -1) return res.status(400).json({ message: "Número no encontrado" });

    user.whatsappNumbers[numberIndex].aiEnabled = enabled;
    await user.save();
    res.json({ success: true, aiEnabled: enabled });
  } catch (error) {
    res.status(500).json({ message: "Error actualizando la IA." });
  }
};

exports.addWhatsAppNumber = async (req, res) => {
    const { number, name } = req.body;
    console.log("📥 Recibido en backend:", req.body); 

    try {
        const user = await User.findOne({ username: req.user.username });
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        // 🔍 Verifica si el número ya existe
        const existingNumber = user.whatsappNumbers.find((n) => n.number === number);
        if (existingNumber) {
            return res.status(400).json({ message: "Número ya registrado" });
        }

        // 🆕 Agregar nuevo número con un _id generado por MongoDB
        const newNumber = { number, name, aiEnabled: false };
        user.whatsappNumbers.push(newNumber);
        await user.save();

        // ✅ Recuperamos el _id recién generado desde la base de datos
        const addedNumber = user.whatsappNumbers.find(n => n.number === number);

        console.log("✅ Número agregado correctamente:", addedNumber);

        res.json({ success: true, numberId: addedNumber._id }); // Enviar _id correcto
    } catch (error) {
        console.error("❌ Error en el backend:", error);
        res.status(500).json({ message: "Error agregando el número." });
    }
};


  

// ✅ **Nuevo controlador para eliminar un número basado en _id**
exports.deleteWhatsAppNumber = async (req, res) => {
    const { numberId } = req.params; // 📌 Cambiado de "number" a "numberId"
    try {
      const user = await User.findOne({ username: req.user.username });
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
  
      // Buscar el número en la base de datos por _id
      const newNumbers = user.whatsappNumbers.filter((n) => n._id.toString() !== numberId);
      
      if (newNumbers.length === user.whatsappNumbers.length) {
        return res.status(400).json({ message: "Número no encontrado" });
      }
  
      await User.updateOne(
        { username: req.user.username },
        { $pull: { whatsappNumbers: { _id: numberId } } }
      );
      
  
      res.json({ success: true, message: "Número eliminado correctamente" });
    } catch (error) {
      console.error("Error eliminando número:", error);
      res.status(500).json({ message: "Error eliminando el número." });
    }
  };
  
 

  exports.updateNumberSettings = async (req, res) => {
    const { numberId } = req.params;
    const { aiEnabled, aiPrompt } = req.body;
  
    if (!numberId) {
      return res.status(400).json({ message: "Error: numberId no proporcionado." });
    }
  
    try {
      const user = await User.findOne({ "whatsappNumbers._id": numberId });
  
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
  
      const numberIndex = user.whatsappNumbers.findIndex((n) => n._id.toString() === numberId);
      if (numberIndex === -1) {
        return res.status(400).json({ message: "Número no encontrado" });
      }
  
      if (aiEnabled !== undefined) user.whatsappNumbers[numberIndex].aiEnabled = aiEnabled;
      if (aiPrompt !== undefined) user.whatsappNumbers[numberIndex].aiPrompt = aiPrompt;
  
      await user.save();
      res.json({ success: true, message: "Configuración actualizada" });
    } catch (error) {
      console.error("❌ Error en el backend al actualizar configuración:", error);
      res.status(500).json({ message: "Error interno del servidor al actualizar configuración." });
    }
  };
  