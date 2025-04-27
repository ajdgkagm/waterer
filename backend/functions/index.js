const functions = require("firebase-functions");
const axios = require("axios");

exports.sendWhatsAppAlert = functions.https.onRequest(async (req, res) => {
  const {message} = req.body;

  const PHONE_NUMBER = "+639668649499"; // Use your registered WhatsApp number
  const API_KEY = "2570719"; // Replace with your CallMeBot API key
  const CALLMEBOT_API_URL = `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`;

  try {
    const response = await axios.get(CALLMEBOT_API_URL);
    return res.status(200).json({success: true, data: response.data});
  } catch (error) {
    return res.status(500).json({success: false, error: error.message});
  }
});
