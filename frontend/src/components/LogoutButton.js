import React from "react";
import { auth } from "../context/firebase-config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../App.css"; // Import CSS file

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return <button className="logout-button" onClick={handleLogout}>Logout</button>;
}

export default LogoutButton;
