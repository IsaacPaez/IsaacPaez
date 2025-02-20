const mongoose = require("mongoose");

const AgentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  prompt: { type: String, required: true },
  imageUrl: { type: String, required: true },
});

module.exports = mongoose.model("Agent", AgentSchema);
