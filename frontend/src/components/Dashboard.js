import React, { useEffect, useState } from "react";
import { db, database } from "../context/firebase-config";
import { ref, onValue } from "firebase/database";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import Papa from "papaparse";
import { saveAs } from 'file-saver';
import "../App.css"; // Import the CSS file

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
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

      const mergedData = {};
      ['ph', 'ntu', 'tds'].forEach((type) => {
        Object.values(rawData[type]).forEach(entry => {
          const ts = entry.timestamp;
          if (!mergedData[ts]) {
            mergedData[ts] = { timestamp: new Date(ts) };
          }
          mergedData[ts][type] = entry.value;
        });
      });

      const sortedData = Object.values(mergedData).sort((a, b) => a.timestamp - b.timestamp);
      setSensorData(sortedData.slice(-20)); // Keep latest 20 entries

      const latestData = sortedData[sortedData.length - 1];
      checkThresholds(latestData, thresholds);
    });

    return () => {
      unsubscribe();
      unsubscribeData();
    };
  }, [thresholds]);

  const checkThresholds = (latestData, thresholds) => {
    if (!latestData || !thresholds) return;

    const { ph, ntu, tds } = latestData;
    let message = "";

    if (ph < thresholds.ph.low || ph > thresholds.ph.high) {
      message += `⚠️ pH Alert: Current pH level is ${ph}.`;
      message += ph < thresholds.ph.low ? `\nSolution: Add chlorine to balance pH.` : `\nSolution: Add caustic soda to reduce pH.`;
    }

    if (ntu < thresholds.ntu.threshold) {
      message += `⚠️ NTU Alert: Current NTU level is ${ntu}.`;
      message += `\nSolution: Inspect the settling tank and check the sludge percentage.`;
    }

    if (tds > thresholds.tds.high) {
      message += `⚠️ TDS Alert: Current TDS level is ${tds}.`;
      message += `\nSolution: Check coagulant tank and settling tank.`;
    }

    if (message) sendWhatsAppAlert(message);
  };

  const sendWhatsAppAlert = async (message) => {
    try {
      await axios.get(`https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${API_KEY}`);
      alert("Alert sent successfully!");
    } catch (error) {
      console.error("Failed to send WhatsApp alert", error);
      alert("Failed to send alert. Check API key or internet connection.");
    }
  };

  const handleManualAlert = () => {
    sendWhatsAppAlert("🚨 Manual Alert Triggered! Please check the water quality system.");
  };

  const exportToCSV = () => {
    const dataToExport = sensorData.map((data) => ({
      Timestamp: data.timestamp.toLocaleString(),
      pH: data.ph,
      NTU: data.ntu,
      TDS: data.tds,
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'sensor_data.csv');
  };

  return (
    <div className="dashboard-container">
      <h2>Real-Time Water Quality Monitoring</h2>
      <Line
        data={{
          labels: sensorData.map((data) => data.timestamp.toLocaleTimeString()),
          datasets: [
            {
              label: "NTU Level",
              data: sensorData.map((data) => data.ntu),
              borderColor: "blue",
              backgroundColor: "blue",
              fill: false,
            },
            {
              label: "PH Water Level",
              data: sensorData.map((data) => data.ph),
              borderColor: "red",
              backgroundColor: "red",
              fill: false,
            },
            {
              label: "TDS",
              data: sensorData.map((data) => data.tds),
              borderColor: "green",
              backgroundColor: "green",
              fill: false,
            },
          ],
        }}
      />

      <div className="alert-container">
        <button onClick={handleManualAlert} className="alert-button">
          🚨 Send Alert
        </button>
        <button onClick={exportToCSV} className="export-button">
          📥 Export Data to CSV
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
