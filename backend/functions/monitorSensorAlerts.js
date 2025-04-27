// backend/functions/monitorSensorAlerts.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

const PHONE_NUMBER = "+639668649499"; // Your registered WhatsApp number
const API_KEY = "2570719"; // CallMeBot API key

async function sendWhatsAppAlert(message) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`;
    try {
        await axios.get(url);
        console.log("WhatsApp alert sent:", message);
    } catch (error) {
        console.error("Error sending alert:", error.message);
    }
}

exports.monitorSensorAlerts = functions.firestore
    .document("sensorData/latest") // Assuming latest data is stored here
    .onWrite(async (change, context) => {
        const data = change.after.data();
        if (!data) return;

        const { pH, turbidity, timestamp } = data;
        let alertMessage = "";

        if (pH < 6) alertMessage += `⚠️ pH too low (${pH}).\n`;
        if (pH > 8.5) alertMessage += `⚠️ pH too high (${pH}).\n`;
        if (turbidity < 1) alertMessage += `⚠️ Turbidity too low (${turbidity}).\n`;
        
        if (alertMessage) {
            alertMessage += `Timestamp: ${new Date(timestamp).toLocaleString()}`;
            await sendWhatsAppAlert(alertMessage);
            await db.collection("alerts").add({
                message: alertMessage,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
