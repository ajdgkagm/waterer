import React, { useEffect, useState } from "react";
import { db, database } from "../context/firebase-config";
import { ref, onValue, set } from "firebase/database";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "../App.css";

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
      if (thresholdsData) {
        setThresholds(thresholdsData);
      }
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
            if (!mergedData[ts]) {
              mergedData[ts] = { timestamp: new Date(ts) };
            }
            mergedData[ts][type] = entry.value ?? null;
          });
        }
      });

      const sortedData = Object.values(mergedData).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      setSensorData(sortedData.slice(-20));

      let latestPh = null;
      let latestNtu = null;
      let latestTds = null;

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
      message += `⚠️ NTU Alert: Current level is ${ntu}, which is above the threshold (${thresholds.customNtuThreshold}).\n`;
      message += `Solution: Kindly examine the settling tank and assess the sludge percentage.\n\n`;
    }

    if (ph > thresholds.customPhThreshold) {
      message += `⚠️ pH Alert: Current pH level is ${ph}, which is above the threshold (${thresholds.customPhThreshold}).\n`;
      message += `Solution: Kindly look over the chlorine tank and add chlorine to balance the pH level.\n\n`;
    }

    if (tds > thresholds.customTdsThreshold) {
      message += `⚠️ TDS Alert: Current level is ${tds}, which is above the threshold (${thresholds.customTdsThreshold}).\n`;
      message += `Solution: Kindly inspect the coagulant tank to ensure that polyaluminum carbon (PAC) is being added to neutralize the water.\n\n`;
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
      alert("Failed to send alert. Check server or internet connection.");
    }
  };

  const handleManualAlert = () => {
    sendWhatsAppAlert(
      "🚨 Manual Alert Triggered! Please check the water quality system."
    );
  };

  const closeModal = () => setShowModal(false);

  const handleThresholdChange = (event, thresholdType) => {
    const value = event.target.value;
    setThresholds((prevState) => ({
      ...prevState,
      [thresholdType]: value,
    }));
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
    <div className="dashboard-container container mt-4">
      <h2 className="text-center mb-4">Real-Time Water Quality Monitoring</h2>

      {/* Bootstrap Threshold Settings */}
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Set Custom TDS Threshold</label>
            <input
              type="number"
              className="form-control"
              value={thresholds.customTdsThreshold}
              onChange={(e) => handleThresholdChange(e, "customTdsThreshold")}
              min="0"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Set Custom pH Threshold</label>
            <input
              type="number"
              className="form-control"
              value={thresholds.customPhThreshold}
              onChange={(e) => handleThresholdChange(e, "customPhThreshold")}
              min="0"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Set Custom NTU Threshold</label>
            <input
              type="number"
              className="form-control"
              value={thresholds.customNtuThreshold}
              onChange={(e) => handleThresholdChange(e, "customNtuThreshold")}
              min="0"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Set Custom Alert Interval (minutes)</label>
            <input
              type="number"
              className="form-control"
              value={thresholds.customAlertInterval}
              onChange={(e) => handleThresholdChange(e, "customAlertInterval")}
              min="1"
            />
          </div>

          <div className="d-grid mb-2">
            <button onClick={saveThresholds} className="btn btn-danger">
              Save Thresholds
            </button>
          </div>
          {saveStatus && <div className="alert alert-info">{saveStatus}</div>}
        </div>
      </div>

      {/* Chart for Sensor Data */}
      <div className="my-5">
        <Line
          data={{
            labels: sensorData.map((data) =>
              data.timestamp.toLocaleTimeString()
            ),
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
      </div>

      {/* Alert Button */}
      <div className="text-center mb-4">
        <button onClick={handleManualAlert} className="btn btn-warning">
          🚨 Send Alert
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="custom-modal">
            <p>{modalMessage}</p>
            <button className="btn btn-secondary mt-2" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
