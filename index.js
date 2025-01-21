const http = require("http");

// Define el puerto usando process.env.PORT o un valor por defecto
const PORT = process.env.PORT || 8080;

// Crea un servidor básico
const server = http.createServer((req, res) => {
  // Configura la cabecera de la respuesta
  res.writeHead(200, { "Content-Type": "text/plain" });

  // Respuesta básica con información del puerto
  res.end(`Servidor funcionando en el puerto: ${PORT}`);
});

// Inicia el servidor
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
