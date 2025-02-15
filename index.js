const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const connectDB = require("./config/db"); // Conexión a MongoDB
require("dotenv").config();

// Importar rutas
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

// Configurar middleware
app.use(cors());
app.use(express.json());

// Configurar rutas
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.set("io", io);

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Middleware de manejo de errores globales
app.use((err, req, res, next) => {
  console.error("❌ Error en el servidor:", err.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Iniciar servidor SOLO después de conectar a MongoDB
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ No se pudo conectar a MongoDB:", err);
    process.exit(1); // Detener la aplicación si hay un fallo en la conexión a MongoDB
  });
