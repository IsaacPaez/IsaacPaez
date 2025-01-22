const express = require("express");
const app = express();

// Usa el puerto asignado por Railway o 3000 como fallback
const PORT = process.env.PORT || 3000;

// Ruta principal que muestra "Hola Mundo"
app.get("/", (req, res) => {
  res.send("Hola Mundo");
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
