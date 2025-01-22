const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hola Mundo");
  } else if (req.url === "/favicon.ico") {
    res.writeHead(204); // Sin contenido para favicon
    res.end();
  } else {
    res.writeHead(404);
    res.end("Ruta no encontrada");
  }
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
