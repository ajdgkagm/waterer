import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import axios from "axios";

// WhatsApp Alert Function
export const sendWhatsAppAlert = async (message) => {
  try {
    const response = await axios.get("http://localhost:5000/send-alert", {
      params: {
        phone: "639668649499",
        message: message,
      },
    });
    console.log("Alert sent via backend:", response.data);
  } catch (error) {
    console.error("Frontend failed to send alert:", error.message);
  }
};

// Firestore Alert Monitoring
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
        const alertMessage = alertData.message.startsWith("🚨 Alert:")
  ? alertData.message
  : `🚨 Alert: ${alertData.message}`;
sendWhatsAppAlert(alertMessage);
          processedAlertIds.add(docId);
        }
      }
    });
  });
};

