const OpenAI = require("openai");
const User = require("../models/User");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAIResponse(
  prompt,
  userMessage,
  model = "gpt-3.5-turbo",
  chatHistory
) {
  try {
    // Preparamos los mensajes incluyendo el historial de chat
    let messages = [{ role: "system", content: prompt }];

    // Añadimos el historial de chat si existe
    if (chatHistory && chatHistory.length > 0) {
      messages = [...messages, ...chatHistory];
    }

    // Añadimos el mensaje actual del usuario
    messages.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 120, // Define el límite de tokens por respuesta
    });

    const aiResponse =
      response.choices[0]?.message?.content?.trim() ||
      "No tengo respuesta en este momento.";
    return aiResponse;
  } catch (error) {
    console.error("❌ Error con OpenAI:", error);
    return "Hubo un error al procesar tu mensaje.";
  }
}

module.exports = { getAIResponse };
