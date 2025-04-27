import React, { useEffect, useState } from "react";
import { db } from "../context/firebase-config";
import { collection, query, orderBy, where, getDocs, onSnapshot, limit } from "firebase/firestore";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import axios from "axios";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import "../App.css"; // Import the CSS file

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const PHONE_NUMBER = "+639668649499";
  const API_KEY = "2570719";

  useEffect(() => {
    const q = query(collection(db, "sensorData"), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setSensorData(data);
      checkThresholds(data[0]); // Check alerts automatically
    });
    return () => unsubscribe();
  }, []);

  const checkThresholds = (latestData) => {
    if (!latestData) return;
    const { pH, turbidity } = latestData;
    let message = "";

    if (pH < 6.0 || pH > 8.5) {
      message += `⚠️ pH Alert: Current pH level is ${pH}.\n`;
    }
    if (turbidity < 1.0) {
      message += `⚠️ Turbidity Alert: Current level is ${turbidity}.`;
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
    const data = snapshot.docs.map((doc) => ({
      timestamp: doc.data().timestamp.toDate().toLocaleString(),
      pH: doc.data().pH,
      turbidity: doc.data().turbidity,
    }));

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
      <Line data={{
        labels: sensorData.map((data) => new Date(data.timestamp?.toDate()).toLocaleTimeString()),
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
        ],
      }} />

      {/* Alert Button */}
      <div className="alert-container">
        <button onClick={handleManualAlert} className="alert-button">
          🚨 Send Alert
        </button>
      </div>

      {/* Date Range for Export
      <div className="export-container">
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
