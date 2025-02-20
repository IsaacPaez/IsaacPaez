const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" }, // 👈 Siempre tiene un valor
  token: { type: String }, // 📌 Aseguramos que el token se almacene correctamente
  whatsappNumbers: [
    {
      number: { type: String, required: true },
      name: { type: String, default: "Sin Nombre" },
      aiEnabled: { type: Boolean, default: false },
      aiPrompt: { type: String, default: "Eres un asistente útil." },
    },
  ],
});

module.exports = mongoose.model("User", UserSchema);
