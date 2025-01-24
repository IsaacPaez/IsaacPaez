const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fetch = require("node-fetch"); // Para llamar a la API de OpenAI
require("dotenv").config(); // Para usar variables de entorno como la clave de OpenAI

// Configuración de Express
const app = express();
const PORT = process.env.PORT || 3000;

// Variables globales
let client = null; // Cliente de WhatsApp
let qrString = null; // Almacena el QR actual

// Función para inicializar el cliente
function initializeClient() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // Evento para recibir el QR
  client.on("qr", async (qr) => {
    console.log("QR generado:", qr);
    qrString = qr; // Guardamos el QR para mostrarlo en la ruta
  });

  // Evento cuando el cliente está listo
  client.on("ready", () => {
    console.log("Cliente de WhatsApp listo.");
    qrString = null; // El QR ya no es necesario cuando el cliente está listo
  });

  // Evento para manejar desconexiones
  client.on("disconnected", (reason) => {
    console.log("Cliente desconectado:", reason);
    qrString = null;
    client.destroy();
    initializeClient(); // Reinicia el cliente automáticamente
  });

  // Escuchar mensajes entrantes
  client.on("message", async (message) => {
    console.log(`Mensaje de ${message.from}: ${message.body}`);

    // Generar respuesta con OpenAI
    const reply = await getCompletion(message.body);

    // Enviar respuesta al mismo chat
    try {
      await client.sendMessage(message.from, reply);
      console.log("Respuesta enviada:", reply);
    } catch (err) {
      console.error("Error enviando mensaje:", err);
    }
  });

  // Inicializar cliente
  client.initialize();
}

// Inicializar el cliente al arrancar el servidor
initializeClient();

// Ruta para mostrar el QR
app.get("/qr", async (req, res) => {
  if (!qrString) {
    return res.send(`
      <h1>QR no disponible</h1>
      <p>El cliente está conectado o generando un nuevo QR. Recarga esta página en unos segundos.</p>
    `);
  }

  // Convertir el QR a imagen
  const qrImage = await QRCode.toDataURL(qrString);
  res.send(`
    <div style="text-align: center;">
      <h1>Escanea este código QR</h1>
      <img src="${qrImage}" />
    </div>
  `);
});

// Ruta principal
app.get("/", (req, res) => {
  res.send(`
    <div style="text-align: center;">
      <h1>WhatsApp Web Bot</h1>
      <p>Ve a <a href="/qr">/qr</a> para obtener el código QR y conectar tu cuenta de WhatsApp.</p>
    </div>
  `);
});

// Función para llamar a OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Configura tu clave de OpenAI en el archivo .env

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
        model: "gpt-3.5-turbo", // Modelo a usar
        messages: [
          { role: "system", content: "Eres un asistente útil." },
          { role: "user", content: userMessage },
        ],
        max_tokens: 50, // Límite de tokens en la respuesta
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
