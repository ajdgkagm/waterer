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

    // NTU min/max
    if (ntu < thresholds.minNtu || ntu > thresholds.maxNtu) {
      message += `⚠️ NTU Alert: ${ntu} (Allowed: ${thresholds.minNtu}-${thresholds.maxNtu})\nSolution: Examine the settling tank.\n\n`;
    }

    // pH min/max
    if (ph < thresholds.minPh || ph > thresholds.maxPh) {
      message += `⚠️ pH Alert: ${ph} (Allowed: ${thresholds.minPh}-${thresholds.maxPh})\nSolution: Add chlorine or neutralize.\n\n`;
    }

    // TDS min/max
    if (tds < thresholds.minTds || tds > thresholds.maxTds) {
      message += `⚠️ TDS Alert: ${tds} (Allowed: ${thresholds.minTds}-${thresholds.maxTds})\nSolution: Check coagulant tank (PAC).\n\n`;
    }

    if (message && shouldTriggerAlert()) {
      setAlertMessage(message.trim());
      setToastMessage(message.trim());
      setShowToast(true);
      sendWhatsAppAlert(message.trim());
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

    const responseData = response.data;
    console.log("WhatsApp alert sent. Response:", responseData);

    const responseText =
      typeof responseData === "string"
        ? responseData
        : JSON.stringify(responseData);

    if (responseText.includes("210")) {
      console.warn("WhatsApp not connected: Status Code 210");
      return;
    }

    setToastMessage("✅ WhatsApp alert sent.");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);

    if (
      responseText.includes("You have 0 messages left") ||
      responseText.includes("Please, subscribe")
    ) {
      setSmsLimitAlert(true);
      setTimeout(() => setSmsLimitAlert(false), 6000);
    }
  } catch (error) {
    console.error(
      "Failed to send WhatsApp alert",
      error.response?.data || error.message
    );
    setToastMessage("❌ Failed to send WhatsApp alert");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  }
};


  const handleManualAlert = () => {
    if (!latestSensorValues) {
      sendWhatsAppAlert(
        "🚨 Manual Alert Triggered! Sensor data not available."
      );
      return;
    }

    const { ntu, ph, tds } = latestSensorValues;

    const manualMessage = `🚨 Manual Alert Triggered!

Latest Sensor Readings:
- NTU: ${ntu ?? "N/A"}
- pH: ${ph ?? "N/A"}
- TDS: ${tds ?? "N/A"}

Please check the water quality system immediately.`;

    sendWhatsAppAlert(manualMessage);
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

  return (
    <div className="container py-4">
      <h2 className="mb-4">Real-Time Water Quality Monitoring</h2>

      <div className="card-header">Custom Threshold Settings</div>
      <div className="card-body row g-3">
        {[
          { label: "TDS Min", key: "minTds" },
          { label: "TDS Max", key: "maxTds" },
          { label: "pH Min", key: "minPh" },
          { label: "pH Max", key: "maxPh" },
          { label: "NTU Min", key: "minNtu" },
          { label: "NTU Max", key: "maxNtu" },
          { label: "Alert Interval (min)", key: "customAlertInterval" },
        ].map(({ label, key }) => (
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

      <br></br>
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
