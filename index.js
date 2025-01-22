const http = require("http");

// Usa el puerto asignado por Railway o un valor predeterminado (3000)
const PORT = process.env.PORT || 3000;

// Crea un servidor que responde "¡Hola Mundo desde Railway!"
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Puta Mundo desde Railway!");
});

// Inicia el servidor y escucha en el puerto configurado
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
