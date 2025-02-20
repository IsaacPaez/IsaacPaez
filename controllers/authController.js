const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";

// **Registro de usuario con rol**
const registerUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Faltan datos en el registro" });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe. Inicia sesión." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 📌 Si no se especifica un rol, se asigna "user" por defecto
    const user = new User({ username, password: hashedPassword, role: role || "user" });

    await user.save();

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
    const user = await User.findOneAndUpdate({ username }, { $unset: { token: "" } });

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
    const user = await User.findOne({ username: req.user.username }).select("-password");
    
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
      return res.status(403).json({ message: "Acceso denegado. No eres administrador." });
    }

    const users = await User.find().select("-password");

    res.json(users);
  } catch (error) {
    console.error("❌ Error obteniendo la lista de usuarios:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

module.exports = { registerUser, loginUser, logoutUser, getUserInfo, getUsersList };
