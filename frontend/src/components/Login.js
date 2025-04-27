import React, { useState } from "react";
import { auth } from "../context/firebase-config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import "../App.css"; // Import CSS file

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/"); // Redirect to dashboard after login
    } catch (error) {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="login-container">
    <div className="login-box">
      <h2>Login</h2>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button>Login</button>
      <a href="/register">Create an account</a>
      <a href="/reset-password">Forgot Password?</a>
    </div>
  </div>
  
  );
}

export default Login;
