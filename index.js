const express = require("express");
const app = express();

// Puerto dinámico (Railway usa process.env.PORT)
const PORT = process.env.PORT || 8080;

// Ruta raíz
app.get("/", (req, res) => {
  res.send("<h1>¡Servidor funcionando correctamente!</h1>");
});

// Ruta adicional
app.get("/test", (req, res) => {
  res.json({ message: "Ruta de prueba funcionando correctamente." });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
