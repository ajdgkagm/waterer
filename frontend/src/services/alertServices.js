import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import axios from "axios";

// WhatsApp Alert Function
export const sendWhatsAppAlert = async (message) => {
  try {
    const timestamp = new Date().toLocaleString(); // Get the current timestamp
    const messageWithTimestamp = `${message}\n\nAlert Timestamp: ${timestamp}`; // Append timestamp to message

    const response = await axios.get("http://localhost:5000/send-alert", {
      params: {
        phone: "639668649499",
        message: messageWithTimestamp, // Send message with timestamp
      },
    });
    console.log("Alert sent via backend:", response.data);
  } catch (error) {
    console.error("Frontend failed to send alert:", error.message);
  }
};

// Firestore Alert Monitoring
export const monitorSensorAlerts = () => {
  const db = getFirestore();
  const alertsRef = collection(db, "alerts");

  // Prevent duplicate alerts on reconnect or reload
  const processedAlertIds = new Set();

  onSnapshot(alertsRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const docId = change.doc.id;
        if (!processedAlertIds.has(docId)) {
          const alertData = change.doc.data();
          console.log("New alert received:", alertData);

          // Extract message and append timestamp to it
          const alertMessage = alertData.message.startsWith("🚨 Alert:")
            ? alertData.message
            : `🚨 Alert: ${alertData.message}`;
          
          // Call WhatsApp alert function with the message
          sendWhatsAppAlert(alertMessage);
          
          processedAlertIds.add(docId);
        }
      }
    });
  });
};
