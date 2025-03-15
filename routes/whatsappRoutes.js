const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const User = require("../models/User");
const { getAIResponse } = require("../services/aiService");
const clients = require("../WhatsappClients");
const { sendMessage } = require("../controllers/whatsappController");
const { PhoneNumberUtil } = require("google-libphonenumber");

const router = express.Router();
const phoneUtil = PhoneNumberUtil.getInstance();

router.post("/start-whatsapp", async (req, res) => {
  const { numberId } = req.body;

  console.log("📥 Datos recibidos en /start-whatsapp:", req.body);

  if (!numberId) {
    return res.status(400).json({ message: "Falta el ID del número" });
  }

  try {
    const user = await User.findOne({ "whatsappNumbers._id": numberId });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const numberData = user.whatsappNumbers.find(
      (n) => n._id.toString() === numberId
    );
    if (!numberData) {
      return res.status(404).json({ message: "Número no encontrado" });
    }

    console.log(`✅ Iniciando sesión de WhatsApp para ID: ${numberId}`);

    // Si ya hay una sesión activa, destruirla antes de iniciar una nueva
    if (clients[numberId]) {
      console.log(`🔄 Reiniciando sesión para ${numberData.number}...`);
      await clients[numberId].destroy();
      delete clients[numberId];
    }

    // Crear nuevo cliente de WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: numberId }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    clients[numberId] = client;
    const io = req.app.get("io");

    // 📌 Escuchar evento de QR y enviarlo a la room correcta
    client.on("qr", async (qr) => {
      try {
        const qrImage = await QRCode.toDataURL(qr);
        io.to(numberId).emit("qr-code", { numberId, qr: qrImage });
      } catch (error) {
        console.error("❌ Error procesando el QR:", error);
      }
    });

    // 📌 WhatsApp listo
    client.on("ready", () => {
      io.to(numberId).emit("whatsapp-ready", { numberId });
    });

    client.on("disconnected", async (reason) => {
      console.log(
        `⚠️ WhatsApp desconectado para ${numberData.number}. Motivo: ${reason}`
      );

      try {
        await User.updateOne(
          { "whatsappNumbers._id": numberId },
          { $set: { "whatsappNumbers.$.connected": false } }
        );
      } catch (error) {
        console.error("❌ Error actualizando estado de conexión:", error);
      }

      if (clients[numberId]) {
        try {
          await clients[numberId].destroy();
          delete clients[numberId];
          io.to(numberId).emit("whatsapp-numbers-updated");
        } catch (error) {
          console.log("❌ Error destruyendo la sesión de WhatsApp:", error);
        }
      }
    });

    // 📌 **Escuchar mensajes entrantes y procesar con IA si está activado**
    client.on("message", async (msg) => {
      console.log(`📩 Mensaje recibido de ${msg.from}: ${msg.body}`);

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

        // Cargamos el historial de chat siempre, independientemente de si la IA está activada
        const chat = await msg.getChat();
        const messages = await chat.fetchMessages({ limit: 20 });

        let chatHistory = messages.map((m) => ({
          role: m.fromMe ? "assistant" : "user",
          content: m.body,
          timestamp: m.timestamp,
          to: chat.id,
        }));

        io.to(numberId).emit("chat-history", { numberId, chatHistory });

        // Solo procesamos la respuesta de IA si está habilitada
        if (number.aiEnabled) {
          console.log("✅ La IA está activada. Procesando respuesta...");

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
          }
        } else {
          console.log("⚠️ La IA está desactivada para este número.");
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
    await client.sendMessage(chatId, message);
    console.log(`✅ Mensaje enviado a ${chatId}: ${message}`);
    res.json({ success: true, message: "Mensaje enviado correctamente" });
    // Remove this line: client.initialize();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/stop-whatsapp", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ message: "Falta el número" });

  if (!clients[number])
    return res.status(404).json({ message: "No hay sesión activa" });

  try {
    console.log(`🚪 Cerrando sesión de WhatsApp para ${number}...`);
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

// 🔥 **Evento global para manejar conexiones de socket.io**
const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`🛜 Usuario conectado al socket: ${socket.id}`);

    socket.on("join-room", (roomId) => {
      console.log(`🔗 Usuario ${socket.id} unido a la sala: ${roomId}`);
      socket.join(roomId);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Usuario desconectado: ${socket.id}`);
    });
  });
};

module.exports = { router, setupSocketEvents };
