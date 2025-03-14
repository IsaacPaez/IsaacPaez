const Agent = require("../models/Agent");
const cloudinary = require("../config/cloudinary");
const bcrypt = require("bcrypt");
const { generateSecurePassword } = require("../services/passwordService");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const { notifyNewPassword } = require("../constants");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
      return res
        .status(400)
        .json({ message: "Error: No se subió ninguna imagen." });
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
exports.changeUserPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const password = generateSecurePassword();
    const user = User.findOne({ email });
    const hashedPassword = await bcrypt.hash(password, 10);
    await user.updateOne({ password: hashedPassword });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Nueva contraseña",
      html: notifyNewPassword(password),
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: "Nueva contraseña enviada al correo" });
  } catch (error) {
    console.error("❌ Error en changeUserPassword:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    await User.findByIdAndUpdate(id, { $set: { active: !user.active } });
    return res.status(200).json({ message: "Usuario desactivado" });
  } catch (error) {
    console.error("❌ Error en deactivateUser:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
