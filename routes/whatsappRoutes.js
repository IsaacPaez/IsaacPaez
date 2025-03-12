const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const User = require("../models/User");
const { getAIResponse } = require("../services/aiService");
const clients = require("../WhatsappClients"); // 📌 Almacena sesiones activas de WhatsApp
const { sendMessage } = require("../controllers/whatsappController");

const router = express.Router();
const { PhoneNumberUtil } = require("google-libphonenumber");
const phoneUtil = PhoneNumberUtil.getInstance();

router.post("/start-whatsapp", async (req, res) => {
  const { numberId } = req.body;

  console.log("📥 Datos recibidos en /start-whatsapp:", req.body);

  if (!numberId) {
    console.error("❌ Faltan datos: No se recibió `numberId`.");
    return res.status(400).json({ message: "Falta el ID del número" });
  }

  try {
    const user = await User.findOne({ "whatsappNumbers._id": numberId });

    if (!user) {
      console.error(`❌ Usuario no encontrado para numberId: ${numberId}`);
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const numberData = user.whatsappNumbers.find(
      (n) => n._id.toString() === numberId
    );
    if (!numberData) {
      console.error(
        `❌ Número no encontrado en la base de datos para numberId: ${numberId}`
      );
      return res.status(404).json({ message: "Número no encontrado" });
    }

    console.log(`✅ Iniciando sesión de WhatsApp para ID: ${numberId}`);

    // 📌 Si ya hay una sesión activa, cerrarla antes de iniciar una nueva
    if (clients[numberId]) {
      console.log(`🔄 Reiniciando sesión para ${numberData.number}...`);
      await clients[numberId].destroy();
      delete clients[numberId];
    }

    // ✅ Crear nuevo cliente de WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: numberId }),
      puppeteer: {
        headless: true, // Se ejecuta en segundo plano sin abrir navegador
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    clients[numberId] = client;
    const io = req.app.get("io");

    // 📌 Escuchar evento de QR y enviarlo al frontend
    client.on("qr", async (qr) => {
      console.log(`📌 QR recibido para el número: ${numberData.number}`);

      try {
        const qrImage = await QRCode.toDataURL(qr);
        console.log("✅ QR convertido a imagen correctamente.");
        io.emit("qr-code", { numberId, qr: qrImage });
        console.log("📡 QR enviado al frontend correctamente.");
      } catch (error) {
        console.error("❌ Error procesando el QR:", error);
      }
    });

    // 📌 WhatsApp listo
    client.on("ready", () => {
      console.log(`✅ WhatsApp conectado para el número: ${numberData.number}`);
      io.emit("whatsapp-ready", { numberId });
    });
    client.on("disconnected", async (reason) => {
      console.log(
        `⚠️ WhatsApp desconectado para el número: ${numberData.number}. Motivo: ${reason}`
      );

      try {
        await User.updateOne(
          { "whatsappNumbers._id": numberId },
          { $set: { "whatsappNumbers.$.connected": false } }
        );
        await User.updateOne(
          { "whatsappNumbers._id": numberId },
          { $set: { whatsappNumbers: [] } }
        );
        console.log("✅ Estado de conexión actualizado en la base de datos.");
      } catch (error) {
        console.error("❌ Error actualizando estado de conexión:", error);
      }
      if (clients[numberId]) {
        try {
          if (clients[numberId].puppeteer) {
            console.log("🔄 Cerrando Puppeteer antes de destruir la sesión...");
            await clients[numberId].puppeteer.close();
            await clients[numberId].logout();
            await clients[numberId].destroy();
          }
          console.log("🔄 Destruyendo sesión de WhatsApp...");
          delete clients[numberId];
          console.log("✅ Sesión de WhatsApp destruida correctamente.");
          io.emit("whatsapp-numbers-updated");
        } catch (error) {
          console.log("❌ Error destruyendo la sesión de WhatsApp:", error);
        }
      }
      console.log(
        `🚪 Sesión de WhatsApp cerrada para ${numberData.number} pero el backend sigue funcionando`
      );
    });

    // 📌 Capturar errores
    client.on("auth_failure", (msg) =>
      console.error("❌ Error de autenticación:", msg)
    );
    client.on("disconnected", () => console.log("⚠️ WhatsApp desconectado"));

    // 📌 **Escuchar mensajes entrantes y procesar con IA si está activado**
    client.on("message", async (msg) => {

      console.log(`📩 Mensaje recibido de ${msg.from}: ${msg.body}`);

      // Extraer la parte antes de "@" del ID
      const phoneNumberRaw = msg.to.split("@")[0];

      console.log(`📩 Número llegó como ${phoneNumberRaw}`);

      // Validar que contenga solo dígitos
      if (!/^\d+$/.test(phoneNumberRaw)) {
        console.warn(`El mensaje no proviene de un número válido: ${msg.to}`);
        return; // Se omite el procesamiento para mensajes que no provienen de un número
      }

      try {
        // Si msg.to no tiene un formato internacional, se puede especificar una región por defecto (ej.: "CO")
        let numberProto;
        try {
          // Intentamos parsear usando "CO" como región por defecto
          numberProto = phoneUtil.parse(phoneNumberRaw);
        } catch (err) {
          console.error("❌ Error al parsear con región por defecto, se intenta sin región:", err);
          numberProto = phoneUtil.parse(phoneNumberRaw);
        }

        // Extrae el número nacional sin caracteres no numéricos
        const clientNumber = phoneUtil.getNationalSignificantNumber(numberProto);
        console.log(`🔍 Número extraído correctamente: ${clientNumber}`);

        console.log(
          `🔍 Buscando configuración para el número de WhatsApp: ${clientNumber}`
        );

        // 📌 Buscamos en la base de datos al usuario que tenga este número registrado
        const user = await User.findOne({
          "whatsappNumbers.number": clientNumber,
        });

        if (!user) {
          console.log(
            "❌ Este número de WhatsApp no está registrado en la base de datos."
          );
          return;
        }

        const number = user.whatsappNumbers.find(
          (n) => n.number === clientNumber
        );

        if (!number) {
          console.log("❌ No se encontró el número en la base de datos.");
          return;
        }

        console.log("✅ La IA está activada. Procesando respuesta...");

        const chat = await msg.getChat();
        const messages = await chat.fetchMessages({ limit: 6 });

        // Obtener el historial del chat en formato estructurado
        const chatHistory = messages
          .map((m) => ({
            role: m.fromMe ? "user" : "assistant",
            content: m.body,
            timestamp: m.timestamp,
            to: chat.id,
          }))
          .reverse(); // Invertimos para tener orden cronológico

        io.emit("chat-history", { numberId, chatHistory });
        // Obtener respuesta de la IA incluyendo el historial
        if (!number.aiEnabled) {
          console.log("⚠️ La IA está desactivada para este número.");
          return;
        }
        const aiResponse = await getAIResponse(
          number.aiPrompt,
          msg.body,
          number.aiModel,
          chatHistory
        );
        
        if (aiResponse) {
          msg.reply(aiResponse);
          io.emit("chat-history", { numberId, chatHistory });
          console.log(`✅ Mensaje enviado a ${msg.from}:`, aiResponse);
        } else {
          console.log("❌ No se pudo generar una respuesta.");
        }
      } catch (error) {
        console.error("❌ Error procesando el mensaje:", error);
      }
    });

    client.initialize();
    res.json({ success: true, message: "WhatsApp iniciado", numberId });
  } catch (error) {
    console.error("❌ Error al iniciar WhatsApp:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/send-message", async (req, res) => {
  try {
    const { content, previous, numberId } = req.body;
    console.log(req.body);

    if (!previous || !previous.to || !previous.to._serialized) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const chatId = previous.to._serialized; // Número de WhatsApp en formato correcto
    const message = content; // Mensaje a enviar

    // Verifica si la sesión de WhatsApp está activa
    const client = clients[numberId];
    if (!client) {
      return res
        .status(404)
        .json({ error: "No hay sesión activa para este número" });
    }

    // Enviar mensaje
    await client.sendMessage(chatId, message);
    console.log(`✅ Mensaje enviado a ${chatId}: ${message}`);

    res.json({ success: true, message: "Mensaje enviado" });
  } catch (error) {
    console.error("❌ Error enviando mensaje:", error);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// ✅ Cerrar sesión de WhatsApp
router.post("/stop-whatsapp", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ message: "Falta el número" });

  if (!clients[number])
    return res.status(404).json({ message: "No hay sesión activa" });

  try {
    console.log(`🚪 Cerrando sesión de WhatsApp para ${number}...`);

    // 📌 Cerrar Puppeteer antes de destruir la sesión
    if (clients[number] && clients[number].puppeteer) {
      console.log("🔄 Cerrando Puppeteer antes de destruir la sesión...");
      await clients[number].puppeteer.close();
    }

    await clients[number].destroy();
    delete clients[number];

    await User.updateOne(
      { "whatsappNumbers.number": number },
      { $set: { "whatsappNumbers.$.connected": false } }
    );

    console.log(`✅ Sesión cerrada correctamente para ${number}`);
    res.json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("❌ Error cerrando sesión:", error);
    res.status(500).json({ message: "Error cerrando sesión" });
  }
});

module.exports = router;
