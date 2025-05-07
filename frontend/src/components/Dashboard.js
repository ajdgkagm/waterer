import React, { useEffect, useState } from "react";
import { db, database } from "../context/firebase-config";
import { ref, onValue } from "firebase/database";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import Papa from "papaparse";
import { query, collection, where, orderBy, getDocs } from "firebase/firestore"; // Import missing Firestore functions
import { saveAs } from 'file-saver'; // Import saveAs for file saving
import "../App.css"; // Import the CSS file

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [thresholds, setThresholds] = useState(null);

  const PHONE_NUMBER = "+639668649499";
  const API_KEY = "2570719";

  useEffect(() => {
    // Fetch threshold values from Firebase
    const thresholdsRef = ref(database, "thresholds");
    const unsubscribe = onValue(thresholdsRef, (snapshot) => {
      const thresholdsData = snapshot.val();
      setThresholds(thresholdsData);
    });

    const dataRef = ref(database, "sensor_data");

    
    const unsubscribeData = onValue(dataRef, (snapshot) => {
      const rawData = snapshot.val();
      if (!rawData) return;
    

      console.log(rawData,'rawData');
      console.log(Object.values(rawData.ntu),'ntu');

      const entries = Object.entries(rawData).sort((a, b) => a[1].timestamp - b[1].timestamp);
      const latestEntry = entries[entries.length - 1][1];
    
      const latestData = {
        timestamp: new Date(latestEntry.timestamp),
        pH: latestEntry.pH,
        turbidity: latestEntry.turbidity,
        tds: latestEntry.tds,
      };
    
      setSensorData(prevData => {
        const newData = [...prevData, latestData];
        return newData.slice(-20); // Keep only latest 20 entries
      });
      
      checkThresholds(latestData, thresholds);
    });
    return () => {
      unsubscribe();
      unsubscribeData();
    };
  }, [thresholds]); // Ensure thresholds are updated correctly

  const checkThresholds = (latestData, thresholds) => {
    if (!latestData || !thresholds) return;

    const { pH, turbidity, tds } = latestData;
    let message = "";

    // Check pH threshold
    if (pH < thresholds.ph.low || pH > thresholds.ph.high) {
      message += `⚠️ pH Alert: Current pH level is ${pH}.`;
      if (pH < thresholds.ph.low) {
        message += `\nSolution: Kindly look over the chlorine tank and add chlorine to balance the pH level.`;
      } else {
        message += `\nSolution: The pH is raised; please inspect the effluent tank and add caustic soda to adjust the pH level accordingly.`;
        message += `\nWarning: Caustic soda poses a risk of injury to your hands. Please wear gloves immediately.`;
      }
    }

    // Check turbidity threshold
    if (turbidity < thresholds.turbidity.threshold) {
      message += `⚠️ Turbidity Alert: Current level is ${turbidity}.`;
      message += `\nSolution: Kindly examine the settling tank and assess the sludge percentage.`;
    }

    // Check TDS threshold
    if (tds > thresholds.tds.high) {
      message += `⚠️ TDS Alert: Current level is ${tds}.`;
      message += `\nSolution 1: Kindly inspect the coagulant tank to ensure that polyaluminum carbon (PAC) is being added to neutralize the water.`;
      message += `\nSolution 2: If the coagulant tank contains polyaluminum carbon and TDS is still elevated, check the settling tank and assess the sludge percentage.`;
    }

    if (message) sendWhatsAppAlert(message);
  };

  const sendWhatsAppAlert = async (message) => {
    try {
      await axios.get(
        `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(
          message
        )}&apikey=${API_KEY}`
      );
      alert("Alert sent successfully!");
    } catch (error) {
      console.error("Failed to send WhatsApp alert", error);
      alert("Failed to send alert. Check API key or internet connection.");
    }
  };

  const handleManualAlert = () => {
    sendWhatsAppAlert("🚨 Manual Alert Triggered! Please check the water quality system.");
  };

  
  return (
    <div className="dashboard-container">
     
      <h2>Real-Time Water Quality Monitoring</h2>
      <Line
      key={JSON.stringify(sensorData)}
        data={{
          labels: sensorData.map((data) => data.timestamp.toLocaleTimeString()),
          datasets: [
            {
              label: "pH Level",
              data: sensorData?.ntu ? Object.values(sensorData.ntu) : [],
              borderColor: "blue",
              fill: false,
            },
            {
              label: "Turbidity",
              data: sensorData?.ph ? Object.values(sensorData.ph) : [],
              borderColor: "red",
              fill: false,
            },
            {
              label: "TDS",
              data:sensorData?.tds ? Object.values(sensorData.tds) : [],
              borderColor: "green",
              fill: false,
            },
          ],
        }}
      />

      {/* Alert Button */}
      <div className="alert-container">
        <button onClick={handleManualAlert} className="alert-button">
          🚨 Send Alert
        </button>
      </div>

      
    </div>
  );
};

export default Dashboard;
