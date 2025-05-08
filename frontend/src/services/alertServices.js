import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import axios from "axios";

// WhatsApp Alert Function
export const sendWhatsAppAlert = async (message) => {
  const PHONE_NUMBER = "639668649499"; // Your registered WhatsApp number
  const API_KEY = "2570719"; // Replace with your CallMeBot API key
  const CALLMEBOT_API_URL = `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`;

  try {
    const response = await axios.get(CALLMEBOT_API_URL);
    console.log("WhatsApp alert sent successfully:", response.data);
  } catch (error) {
    console.error("Error sending WhatsApp alert:", error.message);
  }
};

// Firestore Alert Monitoring
export const monitorSensorAlerts = () => {
  const db = getFirestore();
  const alertsRef = collection(db, "alerts");

  onSnapshot(alertsRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const alertData = change.doc.data();
        console.log("New alert received:", alertData);
        sendWhatsAppAlert(`🚨 Alert: ${alertData.message}`);
      }
    });
  });
};
