const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const User = require("../models/User");
const { getAIResponse } = require("../services/aiService");

const clients = {}; // Almacena sesiones activas de WhatsApp

exports.startWhatsAppSession = async (req, res) => {
  const { username, number } = req.body;

  if (!username || !number) {
    return res.status(400).json({ message: "Faltan datos requeridos" });
  }

  if (clients[number]) {
    console.log(`🔄 Reiniciando sesión para ${number}...`);
    await clients[number].puppeteer.close();
    await clients[number].destroy();
    delete clients[number];
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: number }),
    puppeteer: {
      executablePath: require("puppeteer").executablePath(),
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  clients[number] = client;
  const io = req.app.get("io");

  client.on("qr", async (qr) => {
    console.log(`📌 QR recibido para el número: ${number}`);

    try {
      const qrImage = await QRCode.toDataURL(qr);
      console.log("✅ QR convertido a imagen correctamente.");

      const user = await User.findOne({ "whatsappNumbers.number": number });
      if (!user) {
        console.error("❌ Usuario no encontrado en la base de datos.");
        return;
      }

      const numberEntry = user.whatsappNumbers.find((n) => n.number === number);
      if (!numberEntry) {
        console.error("❌ Número no encontrado en la base de datos.");
        return;
      }

      io.emit("qr-code", { numberId: numberEntry._id, qr: qrImage });

      console.log("📡 QR enviado al frontend correctamente.");
    } catch (error) {
      console.error("❌ Error procesando el QR:", error);
    }
  });

  client.on("ready", () => {
    console.log(`✅ WhatsApp conectado para el número: ${number}`);
    io.emit("whatsapp-ready", { number });
  });

  client.on("message", async (message) => {
    console.log(`📩 Mensaje recibido de ${message.from}: ${message.body}`);

    if (message.from.includes("@g.us")) {
      console.log("⚠️ Mensaje ignorado porque proviene de un grupo.");
      return;
    }

    try {
      // 📌 Normalizar números (eliminar espacios y caracteres extra)
      const botNumber = number.replace(/\D/g, "");
      const senderNumber = message.from.replace(/\D/g, "");

      console.log(
        `🔍 Buscando configuración para el número receptor: ${botNumber}`
      );

      // 📌 Buscar el usuario dueño del número receptor (bot)
      let user = await User.findOne({ "whatsappNumbers.number": botNumber });

      if (!user) {
        console.log(
          `❌ El número ${botNumber} no está registrado en la base de datos.`
        );
        return;
      }

      // 📌 Buscar el número en la lista de WhatsAppNumbers
      let numberEntry = user.whatsappNumbers.find(
        (n) => n.number.replace(/\D/g, "") === botNumber
      );

      if (!numberEntry) {
        console.log(`❌ No se encontró el número dentro del usuario.`);
        return;
      }

      // 📌 **Guardar mensaje en la base de datos**
      numberEntry.chats.push({
        sender: senderNumber,
        message: message.body,
        timestamp: new Date(),
      });

      // 📌 **Mantener solo los últimos 7 mensajes**
      if (numberEntry.chats.length > 7) {
        numberEntry.chats = numberEntry.chats.slice(-7);
      }

      // 🔥 Guardar cambios en MongoDB
      await user.save();

      console.log(
        `✅ Mensaje guardado en la base de datos para el número: ${botNumber}`
      );

      // 📌 **Responder con IA si está activado**
      if (numberEntry.aiEnabled) {
        console.log("✅ La IA está activada. Procesando respuesta...");

        const chatHistory = numberEntry.chats
          .map((msg) => `${msg.sender}: ${msg.message}`)
          .join("\n");

        const aiResponse = await getAIResponse(
          numberEntry.aiPrompt,
          chatHistory,
          message.body,
          user.username
        );

        if (aiResponse) {
          message.reply(aiResponse);
          console.log(`✅ Mensaje enviado a ${message.from}:`, aiResponse);
        } else {
          console.log("❌ No se pudo generar una respuesta.");
        }
      }
    } catch (error) {
      console.error("❌ Error procesando el mensaje:", error);
    }
  });

  client.initialize();
  res.json({ success: true, message: "WhatsApp iniciado", number });
};
