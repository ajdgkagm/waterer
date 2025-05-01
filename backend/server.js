require("dotenv").config(); // Make sure to install dotenv
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const app = express();
app.use(cors());
console.log("ENV CHECK:", {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
});
app.get("/users", async (req, res) => {
  try {
    const listUsers = await admin.auth().listUsers();
    res.json(listUsers.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "N/A",
      photoURL: user.photoURL || "",
      createdAt: new Date(user.metadata.creationTime).toLocaleDateString(),
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
