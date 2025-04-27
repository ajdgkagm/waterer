import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../context/firebase-config";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

const SensorDashboard = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sensorData, setSensorData] = useState([]);
  const phoneNumber = "639668649499"; // Replace with your number
  const apiKey = "2570719"; // Replace with your CallMeBot API Key

  const fetchData = async () => {
    if (!startDate || !endDate) {
      alert("Please select a valid date range.");
      return;
    }

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      // Query Firebase for the selected date range
      const q = query(
        collection(db, "sensorData"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp)
      );

      const querySnapshot = await getDocs(q);
      let data = [];

      querySnapshot.forEach((doc) => {
        data.push(doc.data());
      });

      setSensorData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleExport = () => {
    if (sensorData.length === 0) {
      alert("No data available to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Time,Sensor,Value\n";

    sensorData.forEach(({ timestamp, sensor, value }) => {
      csvContent += `${new Date(timestamp).toLocaleString()},${sensor},${value}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    saveAs(blob, `sensor_data_${startDate}_${endDate}.csv`);
  };

  const sendWhatsAppAlert = async () => {
    if (!startDate || !endDate) {
      alert("Please select a valid date range.");
      return;
    }

    try {
      const message = encodeURIComponent(
        `Alert! Sensor data report from ${startDate} to ${endDate} is ready.`
      );
      const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${message}&apikey=${apiKey}`;

      await fetch(url);
      alert("WhatsApp alert sent!");
    } catch (error) {
      console.error("Error sending WhatsApp alert:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Prepare Chart Data
  const chartData = {
    labels: sensorData.map(({ timestamp }) =>
      new Date(timestamp).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Sensor Values",
        data: sensorData.map(({ value }) => value),
        fill: false,
        backgroundColor: "rgba(0, 123, 255, 0.6)",
        borderColor: "rgba(0, 123, 255, 1)",
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="dashboard-container">
      <h3>Select Date Range</h3>
      <div className="date-picker">
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <button onClick={fetchData} className="fetch-button">
        Load Data
      </button>
      <button onClick={handleExport} className="export-button">
        Download CSV
      </button>
      <button onClick={sendWhatsAppAlert} className="alert-button">
        Send WhatsApp Alert
      </button>

      <div className="chart-container">
        <h3>Sensor Data Chart</h3>
        {sensorData.length > 0 ? (
          <Line data={chartData} />
        ) : (
          <p>No data available for the selected range.</p>
        )}
      </div>
    </div>
  );
};

export default SensorDashboard;
