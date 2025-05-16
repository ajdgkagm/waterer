import React, { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db, database } from "../context/firebase-config";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "bootstrap/dist/css/bootstrap.min.css";

const Dashboard = () => {
  // Sensor data for chart display
  const [sensorData, setSensorData] = useState([]);

  // Threshold settings for alerts and sensor limits
  const [thresholds, setThresholds] = useState({
    minTds: 0,
    maxTds: 10,
    minPh: 6.5,
    maxPh: 8.5,
    minNtu: 0,
    maxNtu: 5,
    customAlertInterval: 10,
  });

  // Telegram bot settings
  const [telegramSettings, setTelegramSettings] = useState({
    botToken: "",
    chatId: "",
  });

  // Toast and alert UI states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Timestamp of last alert sent to enforce alert interval
  const [lastAlertTime, setLastAlertTime] = useState(null);

  // Latest sensor readings
  const [latestSensorValues, setLatestSensorValues] = useState(null);

  // Load thresholds from Firebase Realtime Database
  useEffect(() => {
    const thresholdsRef = ref(database, "thresholds");
    return onValue(thresholdsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setThresholds((prev) => ({
          ...prev,
          ...data,
          minPh: data.minPh ?? 6.5,
          maxPh: data.maxPh ?? 8.5,
          minNtu: data.minNtu ?? 0,
          maxNtu: data.maxNtu ?? 5,
          minTds: data.minTds ?? 0,
          maxTds: data.maxTds ?? 10,
          customAlertInterval: data.customAlertInterval ?? 10,
        }));
      }
    });
  }, []);

  // Load sensor data from Firebase and update latest sensor values
  useEffect(() => {
    const dataRef = ref(database, "sensor_data");
    return onValue(dataRef, (snapshot) => {
      const rawData = snapshot.val();
      if (!rawData) return;

      const mergedData = {};
      ["ph", "ntu", "tds"].forEach((type) => {
        if (rawData[type]) {
          Object.values(rawData[type]).forEach((entry) => {
            if (!entry || !entry.timestamp) return;
            const ts = entry.timestamp;
            if (!mergedData[ts]) mergedData[ts] = { timestamp: new Date(ts) };
            mergedData[ts][type] = entry.value ?? null;
          });
        }
      });

      const sortedData = Object.values(mergedData).sort(
        (a, b) => a.timestamp - b.timestamp
      );
      setSensorData(sortedData.slice(-20)); // keep last 20 records

      // Extract latest values for alerts
      let latestPh = null,
        latestNtu = null,
        latestTds = null;
      for (let i = sortedData.length - 1; i >= 0; i--) {
        const item = sortedData[i];
        if (latestPh === null && item.ph != null) latestPh = item.ph;
        if (latestNtu === null && item.ntu != null) latestNtu = item.ntu;
        if (latestTds === null && item.tds != null) latestTds = item.tds;
        if (latestPh && latestNtu && latestTds) break;
      }

      const latestValues = { ph: latestPh, ntu: latestNtu, tds: latestTds };
      setLatestSensorValues(latestValues);
      checkThresholds(latestValues);
    });
  }, [thresholds]);

  // Load Telegram settings from Firebase
  useEffect(() => {
    const settingsRef = ref(database, "telegramSettings");
    return onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setTelegramSettings(data);
    });
  }, []);

  // Set interval to periodically check thresholds and send alerts
  useEffect(() => {
    if (!latestSensorValues) return;
    const intervalMs = thresholds.customAlertInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      checkThresholds(latestSensorValues);
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [latestSensorValues, thresholds.customAlertInterval]);

  // Check if sensor values breach thresholds and trigger alert
  const checkThresholds = (latestData) => {
    if (!latestData) return;
    const { ph, ntu, tds } = latestData;
    let message = "";

    if (ntu < thresholds.minNtu || ntu > thresholds.maxNtu) {
      message += `⚠️ NTU Alert: ${ntu} (Allowed: ${thresholds.minNtu}-${thresholds.maxNtu})\nSolution: Examine the settling tank.\n\n`;
    }
    if (ph < thresholds.minPh || ph > thresholds.maxPh) {
      message += `⚠️ pH Alert: ${ph} (Allowed: ${thresholds.minPh}-${thresholds.maxPh})\nSolution: Add chlorine or neutralize.\n\n`;
    }
    if (tds < thresholds.minTds || tds > thresholds.maxTds) {
      message += `⚠️ TDS Alert: ${tds} (Allowed: ${thresholds.minTds}-${thresholds.maxTds})\nSolution: Check coagulant tank (PAC).\n\n`;
    }

    if (message && shouldTriggerAlert()) {
      setAlertMessage(message.trim());
      setToastMessage(message.trim());
      setShowToast(true);
      sendTelegramAlert(message.trim());
      setTimeout(() => setShowToast(false), 5000);
    }
  };

  // Decide if alert should trigger based on last alert timestamp and interval
  const shouldTriggerAlert = () => {
    const now = Date.now();
    const interval = thresholds.customAlertInterval * 60 * 1000;
    if (!lastAlertTime || now - lastAlertTime >= interval) {
      setLastAlertTime(now);
      return true;
    }
    return false;
  };

  // Send alert message to Telegram bot via backend API
  const sendTelegramAlert = async (message) => {
    const { botToken, chatId } = telegramSettings;
    if (!botToken || !chatId) {
      console.warn("Missing Telegram bot token or chat ID.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/send-telegram-alert", {
        botToken,
        chatId,
        message,
      });
      console.log("✅ Telegram alert sent:", res.data);
      setToastMessage("✅ Telegram alert sent!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("❌ Telegram alert failed:", err.response?.data || err.message);
    }
  };

  // Handle manual alert triggered by user button
  const handleManualAlert = () => {
    if (!latestSensorValues) {
      sendTelegramAlert("🚨 Manual Alert Triggered! Sensor data not available.");
      return;
    }

    const { ntu, ph, tds } = latestSensorValues;
    let message = `🚨 Manual Alert Triggered!\n\nLatest Sensor Readings:\n- NTU: ${
      ntu ?? "N/A"
    }\n- pH: ${ph ?? "N/A"}\n- TDS: ${tds ?? "N/A"}\n\n`;

    if (ntu < thresholds.minNtu || ntu > thresholds.maxNtu) {
      message += `⚠️ NTU Alert: ${ntu} (Allowed: ${thresholds.minNtu}-${thresholds.maxNtu})\nSolution: Examine the settling tank.\n\n`;
    }
    if (ph < thresholds.minPh || ph > thresholds.maxPh) {
      message += `⚠️ pH Alert: ${ph} (Allowed: ${thresholds.minPh}-${thresholds.maxPh})\nSolution: Add chlorine or neutralize.\n\n`;
    }
    if (tds < thresholds.minTds || tds > thresholds.maxTds) {
      message += `⚠️ TDS Alert: ${tds} (Allowed: ${thresholds.minTds}-${thresholds.maxTds})\nSolution: Check coagulant tank (PAC).\n\n`;
    }

    if (
      ntu >= thresholds.minNtu &&
      ntu <= thresholds.maxNtu &&
      ph >= thresholds.minPh &&
      ph <= thresholds.maxPh &&
      tds >= thresholds.minTds &&
      tds <= thresholds.maxTds
    ) {
      message += "✅ All values are within acceptable thresholds.\n";
    }

    sendTelegramAlert(message);
  };

  // Update thresholds from input fields
  const handleThresholdChange = (e, key) => {
    let value = e.target.value;
    if (value === "") value = null;
    else value = Number(value);
    setThresholds((prev) => ({ ...prev, [key]: value }));
  };

  // Save thresholds to Firebase
  const saveThresholds = async () => {
    try {
      const thresholdsRef = ref(database, "thresholds");
      await set(thresholdsRef, thresholds);
      setToastMessage("Thresholds saved successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error saving thresholds:", error);
      setToastMessage("Failed to save thresholds.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Save Telegram settings to Firebase
  const saveTelegramSettings = async () => {
    try {
      const settingsRef = ref(database, "telegramSettings");
      await set(settingsRef, telegramSettings);
      setToastMessage("Telegram settings saved!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error saving Telegram settings:", error);
      setToastMessage("Failed to save Telegram settings.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Prepare data for Chart.js
  const chartData = {
  labels: sensorData.map((entry) =>
    entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  ),
  datasets: [
    {
      label: "pH",
      data: sensorData.map((entry) => entry.ph),
      borderColor: "rgb(255, 99, 132)",
      backgroundColor: "rgba(255, 99, 132, 0.5)",
      yAxisID: "y",  // Use default y axis
      spanGaps: true,
    },
    {
      label: "NTU",
      data: sensorData.map((entry) => entry.ntu),
      borderColor: "rgb(54, 162, 235)",
      backgroundColor: "rgba(54, 162, 235, 0.5)",
      yAxisID: "y",
      spanGaps: true,
    },
    {
      label: "TDS",
      data: sensorData.map((entry) => entry.tds),
      borderColor: "rgb(75, 192, 192)",
      backgroundColor: "rgba(75, 192, 192, 0.5)",
      yAxisID: "y",
      spanGaps: true,
    },
  ],
};

const chartOptions = {
  responsive: true,
  interaction: {
    mode: "nearest",
    intersect: false,
  },
  scales: {
    y: {
      type: "linear",
      display: true,
      position: "left",
      min: 0,
      max: 1000,  // You can adjust this max to fit all values; note pH will be compressed
      title: {
        display: true,
        text: "Sensor Values",
      },
      ticks: {
        // To help distinguish small pH values, optionally add step size or callback here
      },
    },
    x: {
      display: true,
      title: {
        display: true,
        text: "Time",
      },
    },
  },
};




  return (
    <div className="container my-4">
      <h2>Water Quality Dashboard</h2>

      <div className="mb-4">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="mb-4">
        <h4>Set Thresholds</h4>
        <div className="row">
          {[
            { keyMin: "minPh", keyMax: "maxPh", label: "pH", min: 0, max: 14, step: 0.1 },
            { keyMin: "minNtu", keyMax: "maxNtu", label: "NTU", min: 0, max: 20, step: 0.1 },
            { keyMin: "minTds", keyMax: "maxTds", label: "TDS", min: 0, max: 1000, step: 1 },
          ].map(({ keyMin, keyMax, label, min, max, step }) => (
            <div className="col-md-4" key={label}>
              <div className="form-group mb-3">
                <label>{label} Min</label>
                <input
                  type="number"
                  className="form-control"
                  value={thresholds[keyMin]}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(e) => handleThresholdChange(e, keyMin)}
                />
              </div>
              <div className="form-group">
                <label>{label} Max</label>
                <input
                  type="number"
                  className="form-control"
                  value={thresholds[keyMax]}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(e) => handleThresholdChange(e, keyMax)}
                />
              </div>
            </div>
          ))}
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label>Alert Interval (minutes)</label>
              <input
                type="number"
                className="form-control"
                value={thresholds.customAlertInterval}
                min={1}
                max={60}
                onChange={(e) => handleThresholdChange(e, "customAlertInterval")}
              />
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveThresholds}>
          Save Thresholds
        </button>
      </div>

      <div className="mb-4">
        <h4>Telegram Bot Settings</h4>
        <div className="form-group mb-3">
          <label>Bot Token</label>
          <input
            type="text"
            className="form-control"
            value={telegramSettings.botToken}
            onChange={(e) =>
              setTelegramSettings((prev) => ({ ...prev, botToken: e.target.value }))
            }
          />
        </div>
        <div className="form-group mb-3">
          <label>Chat ID</label>
          <input
            type="text"
            className="form-control"
            value={telegramSettings.chatId}
            onChange={(e) =>
              setTelegramSettings((prev) => ({ ...prev, chatId: e.target.value }))
            }
          />
        </div>
        <button className="btn btn-primary" onClick={saveTelegramSettings}>
          Save Telegram Settings
        </button>
      </div>

      <div className="mb-4">
        <button className="btn btn-warning" onClick={handleManualAlert}>
          Send Manual Alert
        </button>
      </div>

      {/* Toast / Alert box */}
      {showToast && (
        <div
          className="alert alert-info position-fixed bottom-0 end-0 m-3"
          style={{ zIndex: 1050, minWidth: "300px" }}
          role="alert"
        >
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{toastMessage}</pre>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
