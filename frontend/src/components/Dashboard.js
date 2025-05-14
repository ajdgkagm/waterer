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
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [lastAlertTime, setLastAlertTime] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [latestSensorValues, setLatestSensorValues] = useState(null);
  const [smsLimitAlert, setSmsLimitAlert] = useState(false);



  const PHONE_NUMBER = "639668649499";
  const API_KEY = "2570719";

  useEffect(() => {
    const thresholdsRef = ref(database, "thresholds");
    const unsubscribe = onValue(thresholdsRef, (snapshot) => {
      const thresholdsData = snapshot.val();
      if (thresholdsData) setThresholds(thresholdsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dataRef = ref(database, "sensor_data");
    const unsubscribeData = onValue(dataRef, (snapshot) => {
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

      const sortedData = Object.values(mergedData).sort((a, b) => a.timestamp - b.timestamp);
      setSensorData(sortedData.slice(-20));

      let latestPh = null, latestNtu = null, latestTds = null;
     for (let i = sortedData.length - 1; i >= 0; i--) {
  const item = sortedData[i];
  if (latestPh === null && item.ph != null) latestPh = item.ph;
  if (latestNtu === null && item.ntu != null) latestNtu = item.ntu;
  if (latestTds === null && item.tds != null) latestTds = item.tds;
  if (latestPh && latestNtu && latestTds) break;
}

const latestValues = { ph: latestPh, ntu: latestNtu, tds: latestTds };
setLatestSensorValues(latestValues); // ✅ store them
checkThresholds(latestValues);
    });

    return () => unsubscribeData();
  }, []);

  useEffect(() => {
  if (!latestSensorValues) return;

  const intervalMs = thresholds.customAlertInterval * 60 * 1000;

  const intervalId = setInterval(() => {
    checkThresholds(latestSensorValues); // Re-check thresholds even without new sensor data
  }, intervalMs);

  return () => clearInterval(intervalId);
}, [latestSensorValues, thresholds.customAlertInterval]);


  const checkThresholds = (latestData) => {
    if (!latestData) return;
    const { ph, ntu, tds } = latestData;
    let message = "";

    if (ntu > thresholds.customNtuThreshold) {
      message += `⚠️ NTU Alert: ${ntu} (Threshold: ${thresholds.customNtuThreshold})\nSolution: Examine the settling tank.\n\n`;
    }

    if (ph > thresholds.customPhThreshold) {
      message += `⚠️ pH Alert: ${ph} (Threshold: ${thresholds.customPhThreshold})\nSolution: Add chlorine.\n\n`;
    }

    if (tds > thresholds.customTdsThreshold) {
      message += `⚠️ TDS Alert: ${tds} (Threshold: ${thresholds.customTdsThreshold})\nSolution: Check coagulant tank (PAC).\n\n`;
    }

    if (message && shouldTriggerAlert()) {
      setAlertMessage(message.trim());  // Display in Alert
      setToastMessage(message.trim());  // Display in Toast
      setShowToast(true);  // Show Toast
      sendWhatsAppAlert(message.trim());

      // Automatically hide the toast after 5 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
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

 const sendWhatsAppAlert = async (message) => {
  try {
    const timestamp = new Date().toLocaleString();
    const messageWithTimestamp = `${message}\n\nAlert Timestamp: ${timestamp}`;

    const response = await axios.get("http://localhost:5000/send-alert", {
      params: {
        phone: PHONE_NUMBER,
        message: messageWithTimestamp,
      },
    });

    const responseText = response.data;

    if (typeof responseText === 'string' && (
      responseText.includes("You have 0 messages left") ||
      responseText.includes("Please, subscribe")
    )) {
      setSmsLimitAlert(true);
      // Auto-hide after 6 seconds
      setTimeout(() => setSmsLimitAlert(false), 6000);
    }

  } catch (error) {
    console.error("Failed to send WhatsApp alert", error);
    setAlertMessage("❌ Failed to send WhatsApp alert. Check server or internet.");
    setToastMessage("❌ WhatsApp alert failed.");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  }
};



  const handleManualAlert = () => {
    sendWhatsAppAlert("🚨 Manual Alert Triggered! Please check the water quality system.");
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

    // Auto-clear after 3 seconds
    setTimeout(() => {
      setSaveStatus("");
    }, 3000);

  } catch (error) {
    console.error("Error saving thresholds:", error);
    setSaveStatus("Failed to save thresholds.");
  }
};

  return (
    <div className="container py-4">
      <h2 className="mb-4">Real-Time Water Quality Monitoring</h2>

      {/* Threshold Settings */}
      <div className="card mb-4">
        <div className="card-header">Custom Threshold Settings</div>
        <div className="card-body row g-3">
          {[{ label: "TDS", key: "customTdsThreshold" }, { label: "pH", key: "customPhThreshold" }, { label: "NTU", key: "customNtuThreshold" }, { label: "Alert Interval (min)", key: "customAlertInterval" }].map(({ label, key }) => (
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
          ))}
          <div className="col-12">
            <button onClick={saveThresholds} className="btn btn-primary me-3">
              Save Thresholds
            </button>
            {saveStatus && <span className="text-success">{saveStatus}</span>}
          </div>
        </div>
      </div>

      {/* Chart */}
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
            <br></br>
      {/* Manual Alert Button */}
      <div className="text-center mb-4">
        <button onClick={handleManualAlert} className="btn btn-danger btn-lg">
          🚨 Send Manual Alert
        </button>
      </div>

      {/* Bootstrap Alert for displaying message */}
      {alertMessage && (
        <div
          className="alert alert-danger alert-dismissible fade show position-fixed top-50 start-50 translate-middle-x w-75 z-index-1050"
          role="alert"
          style={{
            zIndex: 1050,
            maxWidth: '600px',
            textAlign: 'center',
            borderRadius: '10px',
            padding: '20px',
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
      maxWidth: '300px',
      textAlign: 'center',
      borderRadius: '10px',
      padding: '15px',
    }}
  >
    🚫 All free CallMeBot messages used. WhatsApp alerts disabled.
  </div>
)}

      {/* Bootstrap Toast for Alert */}
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
