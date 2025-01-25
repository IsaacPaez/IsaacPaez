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
  const client = new Client({
    authStrategy: new LocalAuth({ clientId }),
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  client.on("qr", async (qr) => {
    console.log(`QR generado para ${clientId}:`, qr);
    qrStrings[clientId] = qr; // Guardamos el QR para mostrarlo en la ruta
  });

  client.on("ready", () => {
    console.log(`Cliente ${clientId} está listo.`);
    qrStrings[clientId] = null; // Limpiamos el QR porque la sesión ya está activa
  });

  client.on("disconnected", async (reason) => {
    console.log(`Cliente ${clientId} desconectado:`, reason);

    try {
      await client.destroy();
    } catch (err) {
      console.error(`Error destruyendo el cliente ${clientId}:`, err);
    }

    setTimeout(() => {
      console.log(`Reiniciando cliente ${clientId}...`);
      initializeClient(clientId);
    }, 2000); // Espera 2 segundos antes de reiniciar
  });

  client.on("error", (err) => {
    console.error(`Error global en cliente ${clientId}:`, err);

    if (err.message.includes("Execution context was destroyed")) {
      console.log(`Reiniciando cliente ${clientId} debido a un error.`);
      setTimeout(() => initializeClient(clientId), 2000);
    }
  });

  client.on("message", async (message) => {
    console.log(`Mensaje de ${message.from} en ${clientId}: ${message.body}`);
    try {
      const reply = await getCompletion(message.body);
      await client.sendMessage(message.from, reply);
      console.log(`Respuesta enviada en ${clientId}:`, reply);
    } catch (err) {
      console.error(`Error enviando mensaje en ${clientId}:`, err);
    }
  });

  client.initialize();
  clients[clientId] = client; // Guardamos el cliente en el objeto
}

// Rutas

// Página principal
app.get("/", (req, res) => {
  const clientsList = Object.keys(clients)
    .map(
      (clientId) =>
        `<li>${clientId} - <a href="/qr/${clientId}">Obtener QR</a> | <a href="/logout/${clientId}">Cerrar Sesión</a></li>`
    )
    .join("");

  res.send(`
    <div style="text-align: center;">
      <h1>Gestión de WhatsApp Web Bot</h1>
      <form action="/start/user1" method="get" style="margin-bottom: 10px;">
        <button type="submit">Iniciar Sesión (User1)</button>
      </form>
      <form action="/start/user2" method="get" style="margin-bottom: 10px;">
        <button type="submit">Iniciar Sesión (User2)</button>
      </form>
      <h2>Clientes Activos</h2>
      <ul>${clientsList || "<p>No hay clientes activos</p>"}</ul>
    </div>
  `);
});

// Inicia un cliente con un ID
app.get("/start/:id", (req, res) => {
  const clientId = req.params.id;

  if (clients[clientId]) {
    return res.send(`<h1>El cliente ${clientId} ya está activo.</h1>`);
  }

  initializeClient(clientId);
  res.send(`
    <h1>Cliente ${clientId} iniciado</h1>
    <p>Ve a <a href="/qr/${clientId}">/qr/${clientId}</a> para escanear el código QR.</p>
  `);
});

// Ruta para mostrar el QR de un cliente
app.get("/qr/:id", async (req, res) => {
  const clientId = req.params.id;

  if (!qrStrings[clientId]) {
    return res.send(`
      <h1>QR no disponible para ${clientId}</h1>
      <p>El cliente está conectado o generando un nuevo QR. Recarga esta página en unos segundos.</p>
    `);
  }

  const qrImage = await QRCode.toDataURL(qrStrings[clientId]);
  res.send(`
    <div style="text-align: center;">
      <h1>Escanea este código QR para ${clientId}</h1>
      <img src="${qrImage}" />
    </div>
  `);
});

// Ruta para cerrar sesión de un cliente
app.get("/logout/:id", async (req, res) => {
  const clientId = req.params.id;

  if (!clients[clientId]) {
    return res.send(`<h1>No hay cliente activo para ${clientId}.</h1>`);
  }

  try {
    await clients[clientId].logout();
    delete clients[clientId];
    qrStrings[clientId] = null;
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
