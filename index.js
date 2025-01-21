const http = require("http");

// Usa el puerto asignado por Railway o 3000 como fallback
const PORT = process.env.PORT || 3000;

// Crea un servidor básico
const server = http.createServer((req, res) => {
  // Configura la cabecera de la respuesta
  res.writeHead(200, { "Content-Type": "text/plain" });

  // Respuesta básica para cualquier ruta
  res.end(`¡Servidor funcionando correctamente en el puerto ${PORT}!`);
});

// Inicia el servidor y escucha en el puerto configurado
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
