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

    // 📌 Si ya hay una sesión activa, cerrarla antes de iniciar una nueva
    if (clients[number]) {
        console.log(`🔄 Reiniciando sesión para ${number}...`);
        await clients[number].destroy();
        delete clients[number];
    }
    
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: number }),
        puppeteer: {
            executablePath: require("puppeteer").executablePath(),
            headless: false, // Cambia a `false` para ver errores en la consola
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
    });
    

    clients[number] = client;
    const io = req.app.get("io");

    client.on("qr", async (qr) => {
        console.log(`📌 [Backend] QR recibido para el número: ${number}`);
        
        try {
            const qrImage = await QRCode.toDataURL(qr);
            console.log("✅ [Backend] QR convertido a imagen correctamente.");
    
            const user = await User.findOne({ "whatsappNumbers.number": number });
            if (!user) {
                console.error("❌ [Backend] Usuario no encontrado en la base de datos.");
                return;
            }
    
            const numberEntry = user.whatsappNumbers.find(n => n.number === number);
            if (!numberEntry) {
                console.error("❌ [Backend] Número no encontrado en la base de datos.");
                return;
            }
    
            const io = req.app.get("io");
            io.emit("qr-code", { numberId: numberEntry._id, qr: qrImage });
    
            console.log("📡 [Backend] QR enviado al frontend correctamente.");
        } catch (error) {
            console.error("❌ [Backend] Error procesando el QR:", error);
        }
    });
    
    
    
    client.on("ready", () => {
        console.log(`✅ [Backend] WhatsApp ya estaba conectado para el número: ${number}`);
        io.emit("whatsapp-ready", { number });
    });

    client.on("message", async (message) => {
        console.log(`📩 Mensaje recibido de ${message.from}: ${message.body}`);

        const user = await User.findOne({ "whatsappNumbers.number": number });
        const numberConfig = user?.whatsappNumbers.find((n) => n.number === number);

        if (numberConfig && numberConfig.aiEnabled) {
            console.log(`🤖 IA activada para ${number}, procesando mensaje...`);
            const aiResponse = await getAIResponse(numberConfig.aiPrompt, message.body);
            await client.sendMessage(message.from, aiResponse);
        }
    });

    client.initialize();
    res.json({ success: true, message: "WhatsApp iniciado", number });
};
