const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const connectDB = require("./config/db"); // Conexión a MongoDB
require("dotenv").config();

console.log("🔍 Variables de entorno cargadas:", process.env);

// Importar rutas
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const {
  router: whatsappRouter,
  setupSocketEvents,
} = require("./routes/whatsappRoutes");
const adminRoutes = require("./routes/adminRoutes"); // ✅ Nueva ruta de administrador

const app = express();
const server = http.createServer(app);

// Configuración de CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://frontend-clicsociable.vercel.app", // 🚀 Dominio de tu frontend en Vercel
  "https://frontend-clicsociable-git-development-david-espejos-projects.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("🚫 CORS bloqueado para este origen"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions)); // ✅ Aplicando CORS solo una vez
app.use(express.json());

const io = new Server(server, { cors: corsOptions });

// Configurar rutas
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/whatsapp", whatsappRouter);
setupSocketEvents(io);
app.use("/api/admin", adminRoutes); // ✅ Ruta agregada

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
    server.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
      console.log("📌 Rutas registradas:");
      console.log("/api/auth");
      console.log("/api/user");
      console.log("/api/whatsapp");
      console.log("/api/admin"); // ✅ Confirma que la ruta de admin está registrada
    });
  })
  .catch((err) => {
    console.error("❌ No se pudo conectar a MongoDB:", err);
    process.exit(1); // Detener la aplicación si hay un fallo en la conexión a MongoDB
  });

process.on("uncaughtException", (err) => {
  console.error("⚠️ Excepción no controlada:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Rechazo de promesa no capturado en:", promise);
});
