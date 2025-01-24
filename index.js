const express = require("express");
const { Client } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fetch = require("node-fetch"); // Para llamar a la API de OpenAI
require("dotenv").config(); // Para usar variables de entorno como la clave de OpenAI

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

// 6) Función para llamar a OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Debes configurar esta clave en tu archivo .env

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
        model: "gpt-3.5-turbo", // Puedes cambiar a otro modelo si es necesario
        messages: [
          { role: "system", content: "Eres un asistente útil." },
          { role: "user", content: userMessage },
        ],
        max_tokens: 50, // Configura el límite de tokens según tu necesidad
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

// 7) Escuchar mensajes entrantes y responder con la IA
client.on("message", async (message) => {
  console.log(`Mensaje de ${message.from}: ${message.body}`);

  // Llama a la IA para obtener una respuesta
  const reply = await getCompletion(message.body);

  // Envía la respuesta al mismo chat
  try {
    await client.sendMessage(message.from, reply);
    console.log("Respuesta enviada:", reply);
  } catch (err) {
    console.error("Error al enviar la respuesta:", err);
  }
});

// 8) Iniciar el cliente
client.initialize();

// 9) Ruta principal
app.get("/", (req, res) => {
  res.send(
    `<h1>Servidor funcionando. Ve a <a href="/qr">/qr</a> para escanear el código.</h1>`
  );
});

// 10) Ruta para ver el QR
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

// 11) Iniciar el servidor en 0.0.0.0 para Railway
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
