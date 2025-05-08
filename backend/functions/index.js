const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")
// Replace with your registered WhatsApp number and API key from CallMeBot
const PHONE_NUMBER = "+639668649499";
const API_KEY = "2570719"; // Your CallMeBot API Key
const corsHandler = cors({ origin: true });
// Function to send WhatsApp alert
async function sendWhatsAppAlert(message) {
  const CALLMEBOT_API_URL = `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`;

  try {
    const response = await axios.get(CALLMEBOT_API_URL);
    console.log("WhatsApp alert sent successfully:", response.data);
  } catch (error) {
    console.error("Error sending WhatsApp alert:", error.message);
  }
}

// Firebase Function to listen for incoming requests to send alerts
exports.sendWhatsAppAlertRequest = functions.https.onRequest(async (req, res) => {
  const {message} = req.body; // Assuming the request body contains the message

  if (!message) {
    return res.status(400).send("Message is required");
  }

  try {
    await sendWhatsAppAlert(message);
    return res.status(200).json({success: true, message: "WhatsApp alert sent!"});
  } catch (error) {
    return res.status(500).json({success: false, message: error.message});
  }
});
