const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Objeto para manejar clientes de WhatsApp
const clients = {};
const qrStrings = {};
const sessionStatus = {};

// URL del backend en Laravel (cPanel)
const LARAVEL_API_URL = "https://tudominio.com/api/v1/whatsapp-message";

// Función para inicializar un cliente de WhatsApp
function initializeClient(clientId) {
  if (clients[clientId]) {
    console.log(`Cliente ${clientId} ya está inicializado.`);
    return;
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId }),
    puppeteer: {
      headless: "new",
      executablePath: "/usr/bin/google-chrome-stable", // Ruta del navegador en Railway
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  clients[clientId] = client;
  qrStrings[clientId] = null;
  sessionStatus[clientId] = "Desconectado";

  client.on("qr", async (qr) => {
    console.log(`QR generado para ${clientId}`);
    qrStrings[clientId] = qr;
    sessionStatus[clientId] = "Escaneando QR";
  });

  client.on("ready", () => {
    console.log(`Cliente ${clientId} está listo.`);
    qrStrings[clientId] = null;
    sessionStatus[clientId] = "Conectado";
  });

  client.on("disconnected", (reason) => {
    console.log(`Cliente ${clientId} desconectado:`, reason);
    sessionStatus[clientId] = "Desconectado";
    setTimeout(() => initializeClient(clientId), 5000);
  });

  // **Nuevo: Enviar mensajes a Laravel**
  client.on("message", async (message) => {
    console.log(`📩 Mensaje recibido de ${message.from}: ${message.body}`);

    try {
      const response = await axios.post(LARAVEL_API_URL, {
        message: message.body,
        user_id: message.from,
      });

      if (response.data.success) {
        await client.sendMessage(message.from, response.data.message);
        console.log(`✅ Respuesta enviada a ${message.from}:`, response.data.message);
      } else {
        console.error(`❌ Error en la respuesta de Laravel:`, response.data.error);
      }
    } catch (error) {
      console.error("❌ Error al enviar mensaje a Laravel:", error);
    }
  });

  client.on("error", (err) => {
    console.error(`Error en cliente ${clientId}:`, err);
  });

  client.initialize();
}

// **Rutas para el servidor Express**
app.get("/", (req, res) => {
  const clientsList = Object.keys(clients)
    .map(
      (clientId) =>
        `<li>${clientId} - Estado: ${sessionStatus[clientId]} - <a href="/qr/${clientId}">Ver QR</a> | <a href="/logout/${clientId}">Cerrar Sesión</a></li>`
    )
    .join("");

  res.send(`
    <div style="text-align: center;">
      <h1>Gestión de Clientes WhatsApp</h1>
      <form action="/start" method="post">
        <input type="text" name="clientId" placeholder="ID del cliente" required />
        <button type="submit">Iniciar Cliente</button>
      </form>
      <h2>Clientes Activos</h2>
      <ul>${clientsList || "<p>No hay clientes activos</p>"}</ul>
    </div>
  `);
});

// **Iniciar sesión con un cliente**
app.post("/start", (req, res) => {
  const clientId = req.body.clientId;

  if (!clientId) {
    return res.status(400).send("Debe proporcionar un ID de cliente.");
  }

  if (clients[clientId]) {
    return res.send(`<h1>El cliente ${clientId} ya está activo.</h1>`);
  }

  initializeClient(clientId);
  res.send(`
    <h1>Cliente ${clientId} iniciado</h1>
    <p>Visita <a href="/qr/${clientId}">/qr/${clientId}</a> para escanear el código QR.</p>
  `);
});

// **Obtener el QR de un cliente**
app.get("/qr/:id", async (req, res) => {
  const clientId = req.params.id;

  if (!qrStrings[clientId]) {
    return res.send(`
      <h1>No hay QR disponible para ${clientId}</h1>
      <p>Espera unos segundos o verifica si la sesión ya está conectada.</p>
    `);
  }

  const qrImage = await QRCode.toDataURL(qrStrings[clientId]);
  res.send(`
    <div style="text-align: center;">
      <h1>Código QR para ${clientId}</h1>
      <img src="${qrImage}" alt="Código QR para ${clientId}" />
    </div>
  `);
});

// **Cerrar sesión de un cliente**
app.get("/logout/:id", async (req, res) => {
  const clientId = req.params.id;

  if (!clients[clientId]) {
    return res.send(`<h1>No hay cliente activo para ${clientId}.</h1>`);
  }

  try {
    await clients[clientId].logout();
    delete clients[clientId];
    delete qrStrings[clientId];
    sessionStatus[clientId] = "Desconectado";
    res.send(`<h1>Sesión cerrada correctamente para ${clientId}.</h1>`);
  } catch (err) {
    console.error(`Error cerrando sesión para ${clientId}:`, err);
    res.send(`<h1>Error al cerrar sesión para ${clientId}.</h1>`);
  }
});

// **Iniciar el servidor**
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
