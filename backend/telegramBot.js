// telegramServer.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Endpoint to send Telegram message
app.post("/send-telegram-message", async (req, res) => {
  const { chat_id, text } = req.body;

  if (!chat_id || !text) {
    return res.status(400).json({ error: "chat_id and text are required" });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN; // Store your bot token in .env file
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await axios.post(url, { chat_id, text });

    res.status(200).json({ result: response.data });
  } catch (error) {
    console.error("Telegram API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to send Telegram message" });
  }
});

app.listen(PORT, () => {
  console.log(`Telegram proxy server listening on port ${PORT}`);
});
