// import axios from "axios";
// import { ref, onValue } from "firebase/database";
// import { database } from "../context/firebase-config";

// const CALLMEBOT_API_URL = "https://api.callmebot.com/whatsapp.php";
// const PHONE_NUMBER = "639668649499"; // Replace with your registered WhatsApp number
// const API_KEY = "2570719"; // Replace with your CallMeBot API Key
// // Function to send WhatsApp alert
// export const sendWhatsAppAlert = async (message) => {
//   try {
//     const response = await axios.get(`${CALLMEBOT_API_URL}?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`);
//     console.log("WhatsApp Alert Sent:", response.data);
//   } catch (error) {
//     console.error("Error sending WhatsApp alert:", error);
//   }
// };

// // Listen for Firebase updates (pH & Turbidity alerts)
// let lastAlertTime = 0;

// export const monitorSensorAlerts = () => {
//   const alertsRef = ref(database, "alerts");

//   onValue(alertsRef, (snapshot) => {
//     if (snapshot.exists()) {
//       const alerts = snapshot.val();
//       Object.values(alerts).forEach((alert) => {
//         const currentTime = Date.now();

//         // Send alert only if it's been at least 1 minute since last alert
//         if (currentTime - lastAlertTime > 60000) {
//           sendWhatsAppAlert(`ALERT 🚨: ${alert.message}`);
//           lastAlertTime = currentTime;
//         }
//       });
//     }
//   });
// };  