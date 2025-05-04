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

    const dataRef = ref(database, "sensor_data/ntu");

    const unsubscribeData = onValue(dataRef, (snapshot) => {
      const rawData = snapshot.val();
      if (!rawData) return;

      const dataArray = Object.entries(rawData).map(([key, value]) => ({
        timestamp: new Date(value.timestamp),
        pH: value.pH,
        turbidity: value.turbidity,
        tds: value.tds, // Assuming TDS is part of the data
      }));

      setSensorData(dataArray.slice(-10));
      checkThresholds(dataArray[dataArray.length - 1], thresholds); // Updated to use 'thresholds' directly
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

  const exportData = async () => {
    if (!startDate || !endDate) {
      alert("Please select a date range.");
      return;
    }

    const startTimestamp = new Date(startDate);
    const endTimestamp = new Date(endDate);

    const q = query(
      collection(db, "sensorData"),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<=", endTimestamp),
      orderBy("timestamp", "asc")
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => {
      const raw = doc.data();
      return {
        ...raw,
        timestamp: raw.timestamp?.toDate ? raw.timestamp.toDate() : new Date(raw.timestamp),
      };
    });

    if (!data.length) {
      alert("No data found for the selected range.");
      return;
    }

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `sensor_data_${startDate}_to_${endDate}.csv`);
  };

  return (
    <div className="dashboard-container">
      <h2>Real-Time Water Quality Monitoring</h2>
      <Line
        data={{
          labels: sensorData.map((data) => data.timestamp.toLocaleTimeString()),
          datasets: [
            {
              label: "pH Level",
              data: sensorData.map((data) => data.pH),
              borderColor: "blue",
              fill: false,
            },
            {
              label: "Turbidity",
              data: sensorData.map((data) => data.turbidity),
              borderColor: "red",
              fill: false,
            },
            {
              label: "TDS",
              data: sensorData.map((data) => data.tds),
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

      {/* Date Range for Export */}
      {/* <div className="export-container">
        <h3>Export Data</h3>
        <div className="date-picker">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span>to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={exportData} className="export-button">📥 Download CSV</button>
      </div> */}
    </div>
  );
};

export default Dashboard;
