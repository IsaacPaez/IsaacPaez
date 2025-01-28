const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Objetos para manejar múltiples clientes
const clients = {};
const qrStrings = {}; // Almacena los QR generados para cada cliente
const sessionStatus = {}; // Almacena el estado de cada sesión

// Función para interactuar con OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getCompletion(userMessage) {
  if (!OPENAI_API_KEY) {
    console.error("Falta la clave de OpenAI en las variables de entorno.");
    return "Lo siento, no puedo procesar tu mensaje porque no está configurada la API de OpenAI.";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres un asistente útil." },
          { role: "user", content: userMessage },
        ],
        max_tokens: 50,
      }),
    });

    const data = await response.json();
    if (!data || !data.choices || data.choices.length === 0) {
      return "Lo siento, no puedo responder a tu mensaje en este momento.";
    }
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error al procesar el mensaje con OpenAI:", error);
    return "Hubo un error al procesar tu mensaje. Intenta más tarde.";
  }
}

// Función para inicializar un cliente con ID único
function initializeClient(clientId) {
  if (clients[clientId]) {
    console.log(`Cliente ${clientId} ya está inicializado.`);
    return;
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId }),
    puppeteer: {
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
    setTimeout(() => initializeClient(clientId), 5000); // Reintenta tras 5 segundos
  });

  client.on("message", async (message) => {
    console.log(`Mensaje recibido en ${clientId} de ${message.from}: ${message.body}`);
    try {
      const reply = await getCompletion(message.body);
      await client.sendMessage(message.from, reply);
      console.log(`Respuesta enviada en ${clientId}:`, reply);
    } catch (err) {
      console.error(`Error enviando mensaje en ${clientId}:`, err);
    }
  });

  client.on("error", (err) => {
    console.error(`Error en cliente ${clientId}:`, err);
  });

  client.initialize();
}

// Rutas
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

app.use(express.urlencoded({ extended: true }));

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

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
