const TelegramBot = require("node-telegram-bot-api");

const token = "7595313245:AAF36j6v-WUZwYtpar21cDLqk8G3sxP0LG0"; // Your working bot token
const bot = new TelegramBot(token, { polling: true });

bot.on("message", (msg) => {
  console.log("📨 Message received!");
  console.log("Chat ID:", msg.chat.id);
  console.log("From:", msg.from.username || msg.from.first_name);
  console.log("Message:", msg.text);

  bot.sendMessage(msg.chat.id, "✅ Hello! Your chat ID is: " + msg.chat.id);
});
