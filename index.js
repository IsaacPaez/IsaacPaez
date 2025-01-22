const http = require("http");

// Usa el puerto proporcionado por Railway o un valor por defecto (3000)
const PORT = process.env.PORT || 3000;

// Crea un servidor básico que responde "Hola Mundo"
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hola Mundo");
});

// Inicia el servidor y escucha en el puerto configurado
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
