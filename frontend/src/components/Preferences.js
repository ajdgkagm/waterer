import React, { useState } from "react";

function Preferences() {
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [pHThreshold, setPHThreshold] = useState(6.5);
  const [turbidityThreshold, setTurbidityThreshold] = useState(5);

  const handleSave = () => {
    // Save to Firebase or localStorage here
    alert("Preferences saved!");
  };

  return (
    <div className="preferences-container">
      <h2>User Preferences</h2>

      <div className="preference-item">
        <label>Enable WhatsApp Notifications:</label>
        <input
          type="checkbox"
          checked={enableNotifications}
          onChange={(e) => setEnableNotifications(e.target.checked)}
        />
      </div>

      <div className="preference-item">
        <label>pH Threshold:</label>
        <input
          type="number"
          value={pHThreshold}
          onChange={(e) => setPHThreshold(parseFloat(e.target.value))}
        />
      </div>

      <div className="preference-item">
        <label>Turbidity Threshold (NTU):</label>
        <input
          type="number"
          value={turbidityThreshold}
          onChange={(e) => setTurbidityThreshold(parseFloat(e.target.value))}
        />
      </div>

      <button className="save-btn" onClick={handleSave}>
        Save Preferences
      </button>
    </div>
  );
}

export default Preferences;
