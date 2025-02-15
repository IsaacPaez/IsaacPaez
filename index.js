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
const whatsappRoutes = require("./routes/whatsappRoutes");

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  "http://localhost:3000",
  "https://frontend-clicsociable.vercel.app", // 🚀 Dominio de tu frontend en Vercel
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

app.use(cors(corsOptions));


app.use(cors(corsOptions));

const io = new Server(server, { cors: corsOptions });

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
