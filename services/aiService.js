const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAIResponse(
  prompt,
  userMessage,
  model = "gpt-3.5-turbo",
  chatHistory = []
) {
  try {
    // Preparamos los mensajes incluyendo el historial de chat
    let messages = [];
    if (prompt) {
      const hasSystemMessage = chatHistory.some(
        (msg) => msg.role === "system" && msg.content === prompt
      );

      if (!hasSystemMessage) {
        messages.push({ role: "system", content: prompt });
      }
    }
    // Añadimos el historial de chat si existe
    if (chatHistory && chatHistory.length > 0) {
      // Convertir el historial completo a formato OpenAI
      const formattedHistory = chatHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      messages = [...messages, ...formattedHistory];
    }

    // Añadimos el mensaje actual del usuario solo si no está ya en el historial
    if (
      !chatHistory.length ||
      chatHistory[chatHistory.length - 1].content !== userMessage ||
      chatHistory[chatHistory.length - 1].role !== "user"
    ) {
      messages.push({ role: "user", content: userMessage });
    }

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 120,
    });

    const aiResponse =
      response.choices[0]?.message?.content?.trim() ||
      "No tengo respuesta en este momento.";

    const TokensCount = response.usage?.completion_tokens || 0;

    return [aiResponse, TokensCount];
  } catch (error) {
    console.error("❌ Error con OpenAI:", error);
    return ["Hubo un error al procesar tu mensaje.", 0];
  }
}

module.exports = { getAIResponse };
