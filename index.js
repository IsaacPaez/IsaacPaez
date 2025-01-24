const express = require("express");
const { Client } = require("whatsapp-web.js");
const QRCode = require("qrcode");

// 1) Configuración de Express
const app = express();

// 2) Puerto para Railway (o 3000 local)
const PORT = process.env.PORT || 3000;

// 3) Configuración básica de Puppeteer para Linux
const client = new Client({
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// 4) Variable para almacenar el QR
let qrString = null;

// 5) Eventos de WhatsApp-Web.js
client.on("qr", (qr) => {
  console.log("QR RECEIVED", qr);
  qrString = qr;
});

client.on("ready", () => {
  console.log("WhatsApp client is ready!");
});

client.on("auth_failure", (msg) => {
  console.error("Authentication failure:", msg);
});

client.on("disconnected", (reason) => {
  console.log("Client was logged out:", reason);
});

// 6) Iniciar el cliente
client.initialize();

// 7) Ruta principal
app.get("/", (req, res) => {
  res.send(
    `<h1>Servidor funcionando. Ve a <a href="/qr">/qr</a> para escanear el código.</h1>`
  );
});

// 8) Ruta para ver el QR
app.get("/qr", async (req, res) => {
  if (!qrString) {
    return res.send("<h1>QR no disponible (posiblemente ya escaneado).</h1>");
  }
  // Convertir el texto del QR en una imagen base64
  const qrImage = await QRCode.toDataURL(qrString);
  res.send(`
    <div style="text-align: center;">
      <h1>Escanea este código QR en WhatsApp</h1>
      <img src="${qrImage}" />
    </div>
  `);
});

// 9) Iniciar el servidor en 0.0.0.0 para Railway
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});