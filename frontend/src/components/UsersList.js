import React, { useEffect, useState } from "react";
import { auth } from "../context/firebase-config";
import { sendPasswordResetEmail } from "firebase/auth";

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setStatus("Password reset email sent!");
    } catch (error) {
      console.error("Error sending reset email:", error);
      setStatus("Failed to send reset email.");
    }
  };

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      {user ? (
        <>
          <p><strong>Email:</strong> {user.email}</p>
          <button onClick={handleResetPassword} className="reset-button">
            Send Password Reset Email
          </button>
          {status && <p>{status}</p>}
        </>
      ) : (
        <p>Loading user...</p>
      )}
    </div>
  );
};

export default UserProfile;
