require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  databaseURL: "ph-sensor-monitor-bsu-cit-firebase-adminsdk-fbsvc-60efd456e0.json",
});

const app = express();

app.use(cors({ origin: true }))


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
    console.error("Failed to fetch users:", error); // 👈 log the full error
    res.status(500).json({ error: error.message });
  }
});

const axios = require("axios");

// Add this to your existing Express server
app.get('/send-alert', async (req, res) => {
  const { phone, message } = req.query;
  if (!phone || !message) {
    return res.status(400).send('Missing phone or message');
  }

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${2570719}`;
  const response = await axios.get(url);
  res.status(200).send(response.data);

  } catch (err) {
    console.error('Error sending alert:', err);
    res.status(500).send('Failed to send alert');
  }
});


console.log("Loaded ENV", {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKeyStartsWith: process.env.FIREBASE_PRIVATE_KEY?.slice(0, 30),
},'env');

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
