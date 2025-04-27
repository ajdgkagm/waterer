// components/ResetPassword.js
import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../context/firebase-config";
import { Link } from "react-router-dom";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Reset link sent to your email.");
    } catch (err) {
      setError("Failed to send reset link. Make sure the email is correct.");
    }
  };

  return (
    <div className="no-sidebar">
  <div className="login-container">
    <div className="login-box">
      <h2>Reset Password</h2>
      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Link</button>
        {message && <p className="success-message">{message}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        <Link to="/login">Back to Login</Link>
      </form>
    </div>
  </div>
</div>

  );
}

export default ResetPassword;
