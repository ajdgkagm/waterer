import React, { useEffect, useState } from "react";
import { db, database } from "../context/firebase-config";
import { ref, onValue, set } from "firebase/database";  // Updated with set() for Firebase Realtime Database
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import Papa from "papaparse";
import { saveAs } from 'file-saver'; // Import saveAs for file saving
import "../App.css"; // Import the CSS file

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [thresholds, setThresholds] = useState(null);
  const [customTdsThreshold, setCustomTdsThreshold] = useState(10); // Custom threshold state
  const [customPhThreshold, setCustomPhThreshold] = useState(7); // Custom pH threshold
  const [customNtuThreshold, setCustomNtuThreshold] = useState(5); // Custom NTU threshold
  const [customAlertInterval, setCustomAlertInterval] = useState(10); // Custom alert interval in minutes
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [lastAlertTime, setLastAlertTime] = useState(null); // Track last alert time
  const [intervalId, setIntervalId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");  // For displaying save status

  const PHONE_NUMBER = "639668649499";
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

      // Merge each sensor type by timestamp
      ["ph", "ntu", "tds"].forEach((type) => {
        Object.values(rawData[type]).forEach((entry) => {
          const ts = entry.timestamp;
          if (!mergedData[ts]) {
            mergedData[ts] = { timestamp: new Date(ts) };
          }
          mergedData[ts][type] = entry.value;
        });
      });

      // Convert merged object to sorted array
      const sortedData = Object.values(mergedData).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      setSensorData(sortedData.slice(-20)); // Keep latest 20 entries
      const latestData = sortedData[sortedData.length - 1];

      checkThresholds(latestData);
    });

    // Set interval to check thresholds every 1 minute (60000 ms)
    const id = setInterval(() => {
      const latestData = sensorData[sensorData.length - 1];
      checkThresholds(latestData);
    }, 60000); // 1 minute interval

    setIntervalId(id); // Save interval id for clearing

    return () => {
      unsubscribe();
      unsubscribeData();
      clearInterval(id); // Clear interval on unmount
    };
  }, [sensorData]); // Ensure sensorData is always up-to-date

  const checkThresholds = (latestData) => {
    if (!latestData) return;

    const { ph, ntu, tds } = latestData;
    let message = "";

    // Check custom pH threshold
    if (ph < customPhThreshold) {
      message += `⚠️ pH Alert: Current pH level is ${ph}.`;
      message += `\nSolution: Kindly look over the chlorine tank and add chlorine to balance the pH level.`;
    }

    // Check custom NTU threshold
    if (ntu > customNtuThreshold) {
      message += `⚠️ NTU Alert: Current level is ${ntu}.`;
      message += `\nSolution: Kindly examine the settling tank and assess the sludge percentage.`;
    }

    // Check custom TDS threshold
    if (tds > customTdsThreshold) {
      message += `⚠️ TDS Alert: Current level is ${tds}.`;
      message += `\nSolution: Kindly inspect the coagulant tank to ensure that polyaluminum carbon (PAC) is being added to neutralize the water.`;
    }

    if (message && shouldTriggerAlert()) {
      setModalMessage(message);
      setShowModal(true); // Show modal if threshold is breached
      sendWhatsAppAlert(message);
    }
  };

  const shouldTriggerAlert = () => {
    const now = new Date().getTime();
    const interval = customAlertInterval * 60 * 1000; // Custom alert interval in milliseconds (converted from minutes)

    // If there's no last alert or the last alert was more than the custom interval ago, trigger alert
    if (!lastAlertTime || now - lastAlertTime >= interval) {
      setLastAlertTime(now); // Update last alert time
      return true;
    }

    return false; // Don't trigger alert if the custom interval hasn't passed
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

  const closeModal = () => {
    setShowModal(false); // Close the modal
  };

  const saveThresholds = () => {
    const thresholdsRef = ref(database, "thresholds");

    // Save thresholds to Firebase Realtime Database
    set(thresholdsRef, {
      ph: customPhThreshold,
      ntu: customNtuThreshold,
      tds: customTdsThreshold,
      alertInterval: customAlertInterval,
    })
      .then(() => {
        setSaveStatus("Thresholds saved successfully!");
        
        // Trigger alert after saving
        sendWhatsAppAlert("✅ Thresholds have been successfully saved.");
        
        // Hide "Thresholds saved successfully!" message after 3 seconds
        setTimeout(() => {
          setSaveStatus("");
        }, 3000);
      })
      .catch((error) => {
        console.error("Error saving thresholds:", error);
        setSaveStatus("Failed to save thresholds.");
      });
  };

  return (
    <div className="dashboard-container">
      <h2>Real-Time Water Quality Monitoring</h2>

      {/* Custom Thresholds */}
      <div className="custom-thresholds">
        <label>
          Set Custom TDS Threshold: 
          <input
            type="number"
            value={customTdsThreshold}
            onChange={(e) => setCustomTdsThreshold(Number(e.target.value))}
            min="0"
          />
        </label>
        <label>
          Set Custom pH Threshold:
          <input
            type="number"
            value={customPhThreshold}
            onChange={(e) => setCustomPhThreshold(Number(e.target.value))}
            min="0"
          />
        </label>
        <label>
          Set Custom NTU Threshold:
          <input
            type="number"
            value={customNtuThreshold}
            onChange={(e) => setCustomNtuThreshold(Number(e.target.value))}
            min="0"
          />
        </label>
        <label>
          Set Custom Alert Interval (minutes):
          <input
            type="number"
            value={customAlertInterval}
            onChange={(e) => setCustomAlertInterval(Number(e.target.value))}
            min="1"
          />
        </label>
        <button onClick={saveThresholds} className="save-button">Save Thresholds</button>
        {saveStatus && <p>{saveStatus}</p>} {/* Display save status */}
      </div>

      {/* Chart for Sensor Data */}
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
              pointRadius: 5,
              pointHoverRadius: 7,
            },
            {
              label: "PH Water Level",
              data: sensorData.map((data) => data.ph),
              borderColor: "red",
              backgroundColor: "red",
              fill: false,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
            {
              label: "TDS",
              data: sensorData.map((data) => data.tds),
              borderColor: "green",
              backgroundColor: "green",
              fill: false,
              pointRadius: 5,
              pointHoverRadius: 7,
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

      {/* Modal for Threshold Breach */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>{modalMessage}</p>
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
