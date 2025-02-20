const Agent = require("../models/Agent");
const cloudinary = require("../config/cloudinary");

exports.getAgents = async (req, res) => {
    try {
      const agents = await Agent.find();
      res.json(agents);
    } catch (error) {
      console.error("❌ Error obteniendo agentes:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  };

  exports.addAgent = async (req, res) => {
    try {
      console.log("📥 Recibiendo datos:", req.body, req.file); // 🔍 Depurar datos recibidos
  
      if (!req.file) {
        return res.status(400).json({ message: "Error: No se subió ninguna imagen." });
      }
  
      // 📌 Subir imagen a Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "agents", // Carpeta en Cloudinary
        use_filename: true,
        unique_filename: true,
      });
  
      console.log("✅ Imagen subida a Cloudinary:", result.secure_url);
  
      // 📌 Guardar en la base de datos
      const newAgent = new Agent({
        title: req.body.title,
        prompt: req.body.prompt,
        imageUrl: result.secure_url, // URL de la imagen subida
      });
  
      await newAgent.save();
      console.log("✅ Agente guardado en la base de datos");
  
      res.json({ success: true, agent: newAgent });
    } catch (error) {
      console.error("❌ Error en addAgent:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };