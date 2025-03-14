const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { emailTemplate } = require("../constants");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";
const otpStore = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// **Registro de usuario con rol**
const registerUser = async (req, res) => {
  try {
    const { username, password, role, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Faltan datos en el registro" });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      return res.status(400).json({
        message: "El usuario o el correo ya están registrados. Inicia sesión.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 📌 Si no se especifica un rol, se asigna "user" por defecto
    const user = new User({
      username,
      password: hashedPassword,
      email,
      role: role || "user",
    });

    await user.save();

    const token = jwt.sign(
      { username: user.username, role: role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    console.log("✅ Token generado correctamente:", token);

    // 📌 **IMPORTANTE**: Enviar también `user` con `role` al frontend
    res.json({ token, user: { username: user.username, role: role } });

    res.json({ success: true, message: "Usuario registrado con éxito" });
  } catch (error) {
    console.error("❌ Error en el registro:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// **Inicio de sesión y generación del token JWT**
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Faltan datos en el login" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    if (!user.active) {
      return res.status(403).json({ message: "Usuario no autorizado" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(403).json({ message: "Contraseña incorrecta" });
    }

    // 📌 Aseguramos que el `role` no sea undefined
    const role = user.role || "user";

    // 📌 Generamos un nuevo token con el `role`
    const token = jwt.sign(
      { username: user.username, role: role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    console.log("✅ Token generado correctamente:", token);

    // 📌 **IMPORTANTE**: Enviar también `user` con `role` al frontend
    res.json({ token, user: { username: user.username, role: role } });
  } catch (error) {
    console.error("❌ Error en el login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// **Cerrar sesión (eliminar token del usuario)**
const logoutUser = async (req, res) => {
  try {
    const { username } = req.user;

    // 📌 Aseguramos que el usuario existe antes de eliminar el token
    const user = await User.findOneAndUpdate(
      { username },
      { $unset: { token: "" } }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("❌ Error al cerrar sesión:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// **Obtener información del usuario autenticado**
const getUserInfo = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ username: user.username, role: user.role });
  } catch (error) {
    console.error("❌ Error obteniendo usuario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// **Obtener lista de usuarios (Solo para Admins)**
const getUsersList = async (req, res) => {
  try {
    // 📌 Solo admins pueden acceder a esta ruta
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Acceso denegado. No eres administrador." });
    }

    const users = await User.find().select("-password");

    res.json(users);
  } catch (error) {
    console.error("❌ Error obteniendo la lista de usuarios:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

const requestResetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Falta el email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = jwt.sign({ email, otp }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    otpStore[email] = { otp, token }; // Almacena temporalmente el OTP
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Restablecer contraseña",
      html: emailTemplate(otp),
    });
    const io = req.app.get("io");
    io.emit("otp-sent", { email, message: "Código OTP enviado" });
    res.json({ message: "Código OTP enviado al correo" });
  } catch (error) {}
};

const verifyOpt = async (req, res) => {
  const { email, otp } = req.body;
  const storedData = otpStore[email];
  console.log({ otp });

  if (!storedData)
    return res.status(400).json({ message: "OTP expirado o inválido" });

  try {
    if (storedData.otp !== otp)
      return res.status(400).json({ message: "Código OTP incorrecto" });

    delete otpStore[email];
    res.json({ message: "Código OTP válido" });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: "Código OTP expirado" });
  }
};

const changePassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.log(error);
    res.json({ message: "Error al actualizar la contraseña" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserInfo,
  getUsersList,
  requestResetPassword,
  verifyOpt,
  changePassword,
};
