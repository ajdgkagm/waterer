require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// === Initialize Firebase Admin SDK ===
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: "https://ph-sensor-monitor-bsu-cit.firebaseio.com",
});

const db = admin.firestore();

// === Initialize Telegram Bot Polling ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// === GET Users from Firebase Auth ===
app.get("/users", async (req, res) => {
  try {
    const listUsers = await admin.auth().listUsers();
    res.json(
      listUsers.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "N/A",
        photoURL: user.photoURL || "",
        createdAt: user.metadata.creationTime || "Unknown",
      }))
    );
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: error.message });
  }
});

// === Telegram Webhook Alert Endpoint ===
app.post("/send-telegram-alert", async (req, res) => {
  try {
    const { chatId, message, botToken } = req.body;

    if (!botToken || !chatId || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing botToken, chatId, or message",
      });
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    });

    console.log("✅ Telegram alert sent:", response.data);
    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ Error sending Telegram message:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: "Failed to send Telegram alert." });
  }
});

// === Telegram Bot /start command listener ===
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  bot.sendMessage(chatId, "👋 Hello! Your bot is now active.");

  try {
    await db.collection("telegramUsers").doc(String(chatId)).set({
      chatId,
      username: user.username || null,
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Saved Telegram user ${chatId} to Firestore`);
  } catch (err) {
    console.error("❌ Failed to save Telegram user:", err.message);
  }
});

// === Optional: WhatsApp Alert using CallMeBot ===
app.get("/send-whatsapp-alert", async (req, res) => {
  const { phone, message } = req.query;

  if (!phone || !message) {
    return res.status(400).json({ success: false, error: "Missing phone or message" });
  }

  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "API key not configured" });
  }

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const response = await axios.get(url);
    console.log("✅ WhatsApp alert sent:", response.data);
    res.status(200).json({ success: true, response: response.data });
  } catch (err) {
    console.error("❌ WhatsApp alert failed:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data || "Failed to send WhatsApp alert" });
  }
});

// === Start Express Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
