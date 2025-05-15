require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const axios = require("axios");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: "https://ph-sensor-monitor-bsu-cit.firebaseio.com",
});

const app = express();
app.use(cors({ origin: true }));

app.get("/users", async (req, res) => {
  try {
    const listUsers = await admin.auth().listUsers();
    console.log("Fetched users:", listUsers.users.length);
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

// WhatsApp alert route via CallMeBot API proxy
app.get('/send-alert', async (req, res) => {
  const { phone, message } = req.query;

  if (!phone || !message) {
    return res.status(400).json({ success: false, error: 'Missing phone or message' });
  }

  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!apiKey) {
    console.error('CALLMEBOT_API_KEY not set in .env');
    return res.status(500).json({ success: false, error: 'API key not configured' });
  }

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
    const response = await axios.get(url);
    res.status(200).json({ success: true, message: response.data });
  } catch (err) {
    console.error('Error sending WhatsApp alert:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp alert' });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
