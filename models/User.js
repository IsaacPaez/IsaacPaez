const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  whatsappNumbers: [
    {
      number: { type: String, required: true },
      name: { type: String, default: "Sin Nombre" },
      aiEnabled: { type: Boolean, default: false },
      aiPrompt: { type: String, default: "Eres un asistente útil." },
      connected: { type: Boolean, default: false }, // ✅ NUEVO: Guarda si el número está conectado o no
    },
  ],
});

module.exports = mongoose.model("User", UserSchema);
