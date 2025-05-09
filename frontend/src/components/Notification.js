import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import { getDatabase, ref, get, child } from "firebase/database";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

const SensorDashboard = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sensorData, setSensorData] = useState([]);
  const [sensorType, setSensorType] = useState("All");
  const [availableSensors, setAvailableSensors] = useState([]);

  const phoneNumber = "639668649499";
  const apiKey = "2570719";

  const fetchData = async () => {
    if (!startDate || !endDate) {
      alert("Please select a valid date range.");
      return;
    }
  
    try {
      const db = getDatabase();
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, "sensor_data"));
  
      if (snapshot.exists()) {
        const sensorDataByType = snapshot.val();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
  
        let allData = [];
  
        // Loop through all sensor types and entries
        for (const sensorType in sensorDataByType) {
          const entries = sensorDataByType[sensorType];
          for (const key in entries) {
            const { timestamp, value } = entries[key];
            const time = new Date(timestamp).getTime();
  
            if (time >= start && time <= end) {
              allData.push({
                timestamp,
                value,
                sensor: sensorType
              });
            }
          }
        }
  
        allData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
        // Extract unique sensor types (should include ntu, ph, tds)
        const sensors = [...new Set(allData.map((d) => d.sensor || "Unknown"))];
        setAvailableSensors(sensors);
  
        // Filter based on selected sensor type
        const filtered = sensorType === "All"
          ? allData
          : allData.filter((d) => d.sensor === sensorType);
  
        setSensorData(filtered);
      } else {
        setSensorData([]);
        setAvailableSensors([]);
      }
    } catch (error) {
      console.error("Error fetching Realtime DB data:", error);
    }
  };
  

  const handleExport = () => {
    if (sensorData.length === 0) {
      alert("No data available to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Time,Sensor,Value\n";

    sensorData.forEach(({ timestamp, sensor, value }) => {
      const timeString = new Date(timestamp).toLocaleString();
      csvContent += `${timeString},${sensor || "N/A"},${value}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    saveAs(blob, `sensor_data_${startDate}_${endDate}.csv`);
  };

  const chartData = {
    labels: sensorData.map((entry) => {
      const ts = new Date(entry.timestamp).getTime();
      return new Date(ts).toLocaleString();
    }),
    datasets: availableSensors.map((sensorType) => {
      // Set colors based on sensor type
      let sensorColor = "";
      if (sensorType === "ntu") {
        sensorColor = "rgba(0, 123, 255, 1)"; // Blue for ntu
      } else if (sensorType === "ph") {
        sensorColor = "rgba(255, 0, 0, 1)"; // Red for ph
      } else if (sensorType === "tds") {
        sensorColor = "rgba(0, 255, 0, 1)"; // Green for tds
      }
  
      return {
        label: `Sensor: ${sensorType}`,
        data: sensorData
          .filter((entry) => entry.sensor === sensorType)
          .map((entry) => entry.value),
        fill: false,
        backgroundColor: sensorColor, // Set the background color for the chart line
        borderColor: sensorColor, // Set the border color for the chart line
        tension: 0.3,
      };
    }),
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

      <div className="sensor-filter">
        <label>Sensor Type: </label>
        <select value={sensorType} onChange={(e) => setSensorType(e.target.value)}>
          <option value="All">All</option>
          {availableSensors.map((sensor, i) => (
            <option key={i} value={sensor}>
              {sensor}
            </option>
          ))}
        </select>
      </div>

      <button onClick={fetchData} className="download-button">Load Data</button>&nbsp;
      <button onClick={handleExport} className="download-button">Export Data</button>

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
