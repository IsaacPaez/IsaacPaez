const OpenAI = require("openai");
const User = require("../models/User");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAIResponse(prompt, chatHistory, userMessage, username) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: chatHistory }, // 📌 Se envía el historial
                { role: "user", content: userMessage }
            ],
            max_tokens: 100,
        });

        const aiResponse = response.choices[0]?.message?.content?.trim() || "No tengo respuesta en este momento.";
        return aiResponse;
    } catch (error) {
        console.error("❌ Error con OpenAI:", error);
        return "Hubo un error al procesar tu mensaje.";
    }
}

module.exports = { getAIResponse };
