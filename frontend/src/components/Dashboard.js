import React, { useEffect, useState } from "react";
import { db, database } from "../context/firebase-config";
import { ref, onValue, set } from "firebase/database";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "bootstrap/dist/css/bootstrap.min.css";

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [thresholds, setThresholds] = useState({
    customTdsThreshold: 10,
    customPhThreshold: 7,
    customNtuThreshold: 5,
    customAlertInterval: 10,
    minPh: 6.5,
    maxPh: 8.5,
    minNtu: 0,
    maxNtu: 5,
    minTds: 0,
    maxTds: 10,
  });
  const [telegramSettings, setTelegramSettings] = useState({
    botToken: "",
    chatId: "",
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [lastAlertTime, setLastAlertTime] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [latestSensorValues, setLatestSensorValues] = useState(null);
  const [smsLimitAlert, setSmsLimitAlert] = useState(false);

  const TELEGRAM_BOT_TOKEN = "8193484376:AAGPCS3hnunvKUCfB1gaWKB8od4QHIYOUK4"; // Replace with your actual bot token
  const TELEGRAM_CHAT_ID = "7255013068"; // Replace with your actual chat ID

  useEffect(() => {
    const thresholdsRef = ref(database, "thresholds");
    return onValue(thresholdsRef, (snapshot) => {
      const thresholdsData = snapshot.val();
      if (thresholdsData) setThresholds(thresholdsData);
    });
  }, []);

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
      setSensorData(sortedData.slice(-20));

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
  }, []);


  useEffect(() => {
  const settingsRef = ref(database, "telegramSettings");
  return onValue(settingsRef, (snapshot) => {
    const settingsData = snapshot.val();
    if (settingsData) setTelegramSettings(settingsData);
  });
}, []);

  useEffect(() => {
    if (!latestSensorValues) return;
    const intervalMs = thresholds.customAlertInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      checkThresholds(latestSensorValues);
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [latestSensorValues, thresholds.customAlertInterval]);

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

  const shouldTriggerAlert = () => {
    const now = new Date().getTime();
    const interval = thresholds.customAlertInterval * 60 * 1000;
    if (!lastAlertTime || now - lastAlertTime >= interval) {
      setLastAlertTime(now);
      return true;
    }
    return false;
  };
  // Example function in React

//  const sendTelegramAlert = async (message) => {
//   const { botToken, chatId } = telegramSettings;

//   if (!botToken || !chatId) {
//     console.warn("Missing Telegram bot token or chat ID.");
//     return;
//   }

//   try {
//   const res = await axios.post("http://localhost:5000/send-telegram-alert", {
//     chatId,
//     botToken,
//     message,
//   });
//   console.log("✅ Telegram alert response:", res.data);
// } catch (err) {
//   console.error("❌ Telegram alert failed:", err.response?.data || err.message);
// }

// };

const sendTelegramAlert = async (message) => {
  const { botToken, chatId } = telegramSettings;

  if (!botToken || !chatId) {
    console.warn("Missing Telegram bot token or chat ID.");
    return;
  }

  try {
    const res = await axios.post("http://localhost:5000/send-telegram-alert", {
      chatId,
      botToken,
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




  const handleManualAlert = () => {
  if (!latestSensorValues || !thresholds) {
    sendTelegramAlert(
      "🚨 Manual Alert Triggered! Sensor data or thresholds not available."
    );
    return;
  }

  const { ntu, ph, tds } = latestSensorValues;

  let message = `🚨 Manual Alert Triggered!\n\nLatest Sensor Readings:\n- NTU: ${
    ntu ?? "N/A"
  }\n- pH: ${ph ?? "N/A"}\n- TDS: ${tds ?? "N/A"}\n\n`;

  // Append recommendations based on thresholds
  if (ntu < thresholds.minNtu || ntu > thresholds.maxNtu) {
    message += `⚠️ NTU Alert: ${ntu} (Allowed: ${thresholds.minNtu}-${thresholds.maxNtu})\nSolution: Examine the settling tank.\n\n`;
  }

  if (ph < thresholds.minPh || ph > thresholds.maxPh) {
    message += `⚠️ pH Alert: ${ph} (Allowed: ${thresholds.minPh}-${thresholds.maxPh})\nSolution: Add chlorine or neutralize.\n\n`;
  }

  if (tds < thresholds.minTds || tds > thresholds.maxTds) {
    message += `⚠️ TDS Alert: ${tds} (Allowed: ${thresholds.minTds}-${thresholds.maxTds})\nSolution: Check coagulant tank (PAC).\n\n`;
  }

  // Final fallback if all values are within range
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


  const handleThresholdChange = (event, type) => {
    const value = event.target.value;
    setThresholds((prev) => ({ ...prev, [type]: value }));
  };

  const saveThresholds = async () => {
    try {
      const thresholdsRef = ref(database, "thresholds");
      await set(thresholdsRef, thresholds);
      setSaveStatus("Thresholds saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      console.error("Error saving thresholds:", error);
      setSaveStatus("Failed to save thresholds.");
    }
  };
  const saveTelegramSettings = async () => {
  try {
    const settingsRef = ref(database, "telegramSettings");
    await set(settingsRef, telegramSettings);
    setSaveStatus("Telegram settings saved!");
    setTimeout(() => setSaveStatus(""), 3000);
  } catch (err) {
    console.error("Failed to save Telegram settings:", err);
    setSaveStatus("Failed to save Telegram settings.");
  }
};


  return (
    <div className="container py-4">
      <h2 className="mb-4">Real-Time Water Quality Monitoring</h2>

      <div className="card-header">Custom Threshold Settings</div>
      <div className="card-body row g-3">
        {[
          "TDS Min",
          "TDS Max",
          "pH Min",
          "pH Max",
          "NTU Min",
          "NTU Max",
          "Alert Interval (min)",
        ].map((label, i) => {
          const key = [
            "minTds",
            "maxTds",
            "minPh",
            "maxPh",
            "minNtu",
            "maxNtu",
            "customAlertInterval",
          ][i];
          return (
            <div key={key} className="col-md-3">
              <label className="form-label">{label}</label>
              <input
                type="number"
                className="form-control"
                value={thresholds[key]}
                onChange={(e) => handleThresholdChange(e, key)}
                min="0"
              />
            </div>
          );
        })}
        <div className="col-12">
          <button onClick={saveThresholds} className="btn btn-primary me-3">
            Save Thresholds
          </button>
          {saveStatus && <span className="text-success">{saveStatus}</span>}
        </div>
      </div>

      <br />
      <div className="card mb-8">
        <div className="card-header">Sensor Data Chart</div>
        <div className="card-body">
          <Line
            data={{
              labels: sensorData.map((d) => d.timestamp.toLocaleTimeString()),
              datasets: [
                {
                  label: "NTU",
                  data: sensorData.map((d) => d.ntu),
                  borderColor: "blue",
                  backgroundColor: "blue",
                  fill: false,
                },
                {
                  label: "pH",
                  data: sensorData.map((d) => d.ph),
                  borderColor: "red",
                  backgroundColor: "red",
                  fill: false,
                },
                {
                  label: "TDS",
                  data: sensorData.map((d) => d.tds),
                  borderColor: "green",
                  backgroundColor: "green",
                  fill: false,
                },
              ],
            }}
          />
        </div>
      </div>

      <br />
      <div className="text-center mb-4">
        <button onClick={handleManualAlert} className="btn btn-danger btn-lg">
          🚨 Send Manual Alert
        </button>
      </div>
      <br></br>
      <div className="card-header mt-4">Telegram Alert Settings</div>
      <br></br>
<div className="card-body row g-3">
  <br></br>
  <div className="col-md-6">
    <label className="form-label">Telegram Bot Token</label>
    <input
      type="text"
      className="form-control"
      value={telegramSettings.botToken}
      onChange={(e) => setTelegramSettings((prev) => ({
        ...prev, botToken: e.target.value
      }))}
    />
  </div>
  <div className="col-md-6">
    <label className="form-label">Telegram Chat ID</label>
    <input
      type="text"
      className="form-control"
      value={telegramSettings.chatId}
      onChange={(e) => setTelegramSettings((prev) => ({
        ...prev, chatId: e.target.value
      }))}
    />
  </div>
  <div className="col-12">
    <button onClick={saveTelegramSettings} className="btn btn-success me-3">
      Save Telegram Settings
    </button>
  </div>
</div>


      {alertMessage && (
        <div
          className="alert alert-danger alert-dismissible fade show position-fixed top-50 start-50 translate-middle-x w-75 z-index-1050"
          role="alert"
          style={{
            zIndex: 1050,
            maxWidth: "600px",
            textAlign: "center",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <strong>Warning!</strong> {alertMessage}
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => setAlertMessage("")}
          ></button>
        </div>
      )}

      {smsLimitAlert && (
        <div
          className="alert alert-warning position-fixed top-0 end-0 m-4 shadow"
          role="alert"
          style={{
            zIndex: 1060,
            maxWidth: "300px",
            textAlign: "center",
            borderRadius: "10px",
            padding: "15px",
          }}
        >
          🚫 All free CallMeBot messages used. WhatsApp alerts disabled.
        </div>
      )}

      {showToast && (
        <div
          className="toast align-items-center text-bg-danger border-0 position-fixed bottom-0 end-0 m-3"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="d-flex">
            <div className="toast-body">{toastMessage}</div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              onClick={() => setShowToast(false)}
            ></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
