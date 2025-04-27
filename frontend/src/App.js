import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { FirebaseProvider } from "./context/FirebaseContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Notification from "./components/Notification";
import Login from "./components/Login";
import LogoutButton from "./components/LogoutButton";
import Users from "./components/UsersList"; // Users page
import Preferences from "./components/Preferences";
import ResetPassword from "./components/ResetPassword";

import { monitorSensorAlerts } from "./services/alertServices";

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login" || location.pathname === "/reset-password";


  return (
    <div className={isLoginPage ? "no-sidebar" : "app-container flex"}>
      {!isLoginPage && <Sidebar />}
      <div className="content flex-grow">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notifications" element={<Notification />} />
          <Route path="/login" element={<Login />} />
          <Route path="/users" element={<Users />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </div>
    </div>
  );
}


function App() {
  useEffect(() => {
    monitorSensorAlerts(); // Keep alert monitoring
  }, []);

  return (
    <FirebaseProvider>
      <Router>
        <AppContent />
      </Router>
    </FirebaseProvider>
  );
}

export default App;
