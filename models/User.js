const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // Número que envió el mensaje
  message: { type: String, required: true }, // Contenido del mensaje
  timestamp: { type: Date, default: Date.now }, // Marca de tiempo del mensaje
});

const WhatsAppNumberSchema = new mongoose.Schema({
  number: { type: String, required: true },
  name: { type: String, default: "Sin Nombre" },
  aiEnabled: { type: Boolean, default: false },
  aiPrompt: { type: String, default: "Eres un asistente útil." },
  aiModel: { type: String, default: "gpt-3.5-turbo" },
  chats: [ChatSchema], // 🔥 Ahora cada número tiene un array de chats
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  token: { type: String },
  active: {type: Boolean, default: true},
  whatsappNumbers: [WhatsAppNumberSchema],
  AiTokensUse: { type: Number, default: 0 },
});

module.exports = mongoose.model("User", UserSchema);
