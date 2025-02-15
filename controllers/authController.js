const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";

// **Registro de usuario**
const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Faltan datos en el registro" });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe. Inicia sesión." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.json({ success: true, message: "Usuario registrado con éxito" });
  } catch (error) {
    console.error("❌ Error en el registro:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// **Inicio de sesión y almacenamiento del token**
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

    // 📌 Generamos un nuevo token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "2h" });

    // 📌 Guardamos el token en la base de datos
    user.token = token;
    await user.save();

    console.log("✅ Token generado y guardado en MongoDB:", token);

    res.json({ token });
  } catch (error) {
    console.error("❌ Error en el login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// **Cerrar sesión (eliminar token del usuario)**
const logoutUser = async (req, res) => {
  try {
    const { username } = req.user;

    // 📌 Eliminamos el token de la base de datos
    const user = await User.findOneAndUpdate({ username }, { token: null });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("❌ Error al cerrar sesión:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

module.exports = { registerUser, loginUser, logoutUser };
