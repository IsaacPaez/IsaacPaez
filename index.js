const express = require("express");
const app = express();

const PORT = process.env.PORT;

// Ruta básica
app.get("/", (req, res) => {
  res.send(`Servidor funcionando en el puerto: ${PORT}`);
});

// Aquí sí puedes usar app.listen
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
