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
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [lastAlertTime, setLastAlertTime] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");

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

      checkThresholds({ ph: latestPh, ntu: latestNtu, tds: latestTds });
    });

    return () => unsubscribeData();
  }, []);

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
      setModalMessage(message.trim());
      setShowModal(true);
      sendWhatsAppAlert(message.trim());
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
      await axios.get("http://localhost:5000/send-alert", {
        params: {
          phone: PHONE_NUMBER,
          message: messageWithTimestamp,
        },
      });
      alert("Alert sent successfully!");
    } catch (error) {
      console.error("Failed to send WhatsApp alert", error);
      alert("Failed to send alert.");
    }
  };

  const handleManualAlert = () => {
    sendWhatsAppAlert("🚨 Manual Alert Triggered! Please check the water quality system.");
  };

  const closeModal = () => setShowModal(false);

  const handleThresholdChange = (event, type) => {
    const value = event.target.value;
    setThresholds((prev) => ({ ...prev, [type]: value }));
  };

  const saveThresholds = async () => {
    try {
      const thresholdsRef = ref(database, "thresholds");
      await set(thresholdsRef, thresholds);
      setSaveStatus("Thresholds saved successfully!");
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
          {[
            { label: "TDS", key: "customTdsThreshold" },
            { label: "pH", key: "customPhThreshold" },
            { label: "NTU", key: "customNtuThreshold" },
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
      </div>

      {/* Chart */}
      <div className="card mb-4">
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

      {/* Alert Button */}
      <div className="text-center mb-4">
        <button onClick={handleManualAlert} className="btn btn-danger btn-lg">
          🚨 Send Manual Alert
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">⚠️ Alert Notification</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <pre>{modalMessage}</pre>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
