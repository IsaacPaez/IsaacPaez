const OpenAI = require("openai");
const User = require("../models/User");


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAIResponse(prompt, userMessage, username, chatHistory) {
    try {
        // Preparamos los mensajes incluyendo el historial de chat
        let messages = [
            { role: "system", content: prompt }
        ];
        
        // Añadimos el historial de chat si existe
        if (chatHistory && chatHistory.length > 0) {
            messages = [...messages, ...chatHistory];
        }
        
        // Añadimos el mensaje actual del usuario
        messages.push({ role: "user", content: userMessage });
        
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            max_tokens: 120, // Define el límite de tokens por respuesta
        });

        const aiResponse = response.choices[0]?.message?.content?.trim() || "No tengo respuesta en este momento.";
        const tokensUsed = response.usage?.total_tokens || 0;  // 🔥 Obtener el número de tokens usados

        // 🔥 Actualizar el contador de tokens del usuario en la base de datos
        await User.findOneAndUpdate(
            { username },
            { $inc: { tokensUsed } }, // Incrementar los tokens usados
            { new: true }
        );

        console.log(`📝 Tokens usados en esta respuesta: ${tokensUsed}`);

        return aiResponse;
    } catch (error) {
        console.error("❌ Error con OpenAI:", error);
        return "Hubo un error al procesar tu mensaje.";
    }
}

module.exports = { getAIResponse };
