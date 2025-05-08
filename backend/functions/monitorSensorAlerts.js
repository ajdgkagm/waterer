const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

const PHONE_NUMBER = "+639668649499"; // Your registered WhatsApp number
const API_KEY = "2570719"; // CallMeBot API key

/**
 * Sends a WhatsApp alert message using the CallMeBot API.
 * @param {string} message - The message to send via WhatsApp.
 * @return {Promise} Resolves when the message is sent, or rejects on error.
 */
async function sendWhatsAppAlert(message) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`;
  try {
    await axios.get(url, { timeout: 10000 });
    console.log("WhatsApp alert sent:", message);
  } catch (error) {
    console.error("Error sending alert:", error.message);
  }
}

/**
 * Firebase function triggered on write to Firestore `sensor_data` collection.
 * It checks if the pH or turbidity levels exceed set thresholds, and sends an alert if necessary.
 * @param {object} change - Represents the document change.
 * @param {object} context - Contains metadata about the Firestore trigger event.
 */
exports.monitorSensorAlerts = functions.firestore
    .document("sensor_data") // Triggered when a document is written to `sensor_data`
    .onWrite(async (change, context) => {
      const data = change.after.data();
      if (!data || !data.timestamp || typeof data.pH !== "number" || typeof data.turbidity !== "number") {
        console.error("Invalid data in sensor_data document");
        return;
      }

      const {pH, turbidity, timestamp} = data;
      let alertMessage = "";

      // Check thresholds for pH and turbidity
      if (pH < 6) alertMessage += `⚠️ pH too low (${pH}).\n`;
      if (pH > 8.5) alertMessage += `⚠️ pH too high (${pH}).\n`;
      if (turbidity < 1) alertMessage += `⚠️ Turbidity too low (${turbidity}).\n`;

      if (alertMessage) {
        alertMessage += `Timestamp: ${new Date(timestamp).toLocaleString()}`;
        await sendWhatsAppAlert(alertMessage);

        try {
          // Store the alert message in Firestore under the `alerts` collection
          await db.collection("alerts").add({
            message: alertMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (error) {
          console.error("Error saving alert to Firestore:", error.message);
        }
      }
    });
