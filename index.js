const express = require("express");
const app = express();

// Usa el puerto asignado por Railway o 3000 como fallback
const PORT = process.env.PORT || 3000;

// Ruta principal
app.get("/", (req, res) => {
  res.send("¡Servidor Express funcionando correctamente!");
});

// Ruta adicional de prueba
app.get("/test", (req, res) => {
  res.json({ message: "Ruta de prueba funcionando correctamente" });
});

// Inicia el servidor y escucha en el puerto configurado
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en el puerto ${PORT}`);
});
