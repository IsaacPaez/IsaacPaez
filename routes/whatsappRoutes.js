const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const User = require("../models/User");
const { getAIResponse } = require("../services/aiService");
const clients = require("../WhatsappClients"); // 📌 Sesiones activas de WhatsApp
const { sendMessage } = require("../controllers/whatsappController");
const { PhoneNumberUtil } = require("google-libphonenumber");

const router = express.Router();
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
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    clients[numberId] = client;
    const io = req.app.get("io");

    // 📌 Unir al usuario a una "room" específica
    io.on("connection", (socket) => {
      console.log(`🛜 Usuario con ID ${numberId} conectado al socket`);
      socket.join(numberId);
    });

    // 📌 Escuchar evento de QR y enviarlo a la room correcta
    client.on("qr", async (qr) => {
      console.log(`📌 QR recibido para el número: ${numberData.number}`);

      try {
        const qrImage = await QRCode.toDataURL(qr);
        console.log("✅ QR convertido a imagen correctamente.");
        io.to(numberId).emit("qr-code", { numberId, qr: qrImage });
        console.log("📡 QR enviado al frontend correctamente.");
      } catch (error) {
        console.error("❌ Error procesando el QR:", error);
      }
    });

    // 📌 WhatsApp listo
    client.on("ready", () => {
      console.log(`✅ WhatsApp conectado para el número: ${numberData.number}`);
      io.to(numberId).emit("whatsapp-ready", { numberId });
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
          io.to(numberId).emit("whatsapp-numbers-updated");
        } catch (error) {
          console.log("❌ Error destruyendo la sesión de WhatsApp:", error);
        }
      }

      console.log(
        `🚪 Sesión de WhatsApp cerrada para ${numberData.number} pero el backend sigue funcionando`
      );
    });

    // 📌 **Escuchar mensajes entrantes y procesar con IA si está activado**
    client.on("message", async (msg) => {
      console.log(`📩 Mensaje recibido de ${msg.from}: ${msg.body}`);

      // 📌 Extraer número y verificar existencia en la base de datos
      let phoneNumberRaw = msg.to.split("@")[0];

      if (!phoneNumberRaw.startsWith("+")) {
        phoneNumberRaw = "+" + phoneNumberRaw;
      }

      try {
        const numberProto = phoneUtil.parse(phoneNumberRaw);
        const clientNumber =
          phoneUtil.getNationalSignificantNumber(numberProto);
        console.log(`🔍 Número extraído correctamente: ${clientNumber}`);

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

        if (!number.aiEnabled) {
          console.log("⚠️ La IA está desactivada para este número.");
          return;
        }

        console.log("✅ La IA está activada. Procesando respuesta...");

        const chat = await msg.getChat();
        const messages = await chat.fetchMessages({ limit: 20 });

        let chatHistory = messages.map((m) => ({
          role: m.fromMe ? "assistant" : "user",
          content: m.body,
          timestamp: m.timestamp,
          to: chat.id,
        }));

        io.to(numberId).emit("chat-history", { numberId, chatHistory });

        const [aiResponse, tokens] = await getAIResponse(
          number.aiPrompt,
          msg.body,
          number.aiModel,
          chatHistory
        );

        await User.updateOne(
          { _id: user._id },
          { $inc: { AiTokensUse: tokens } }
        );

        if (aiResponse) {
          msg.reply(aiResponse);
          chatHistory.push({
            role: "assistant",
            content: aiResponse,
            timestamp: new Date(),
            to: chat.id,
          });
          io.to(numberId).emit("chat-history", { numberId, chatHistory });
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

module.exports = router;
