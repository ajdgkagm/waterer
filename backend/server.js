const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

// Initialize Firebase Admin SDK (Use your service account)
const serviceAccount = require("./ph-sensor-monitor-bsu-cit-firebase-adminsdk-fbsvc-60efd456e0.json"); // Download from Firebase console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());

// API to fetch users
app.get("/users", async (req, res) => {
  try {
    const listUsers = await admin.auth().listUsers();
    res.json(listUsers.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "N/A",
      photoURL: user.photoURL || "",
      createdAt: new Date(user.metadata.creationTime).toLocaleDateString()
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
