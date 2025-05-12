import React, { useEffect, useState } from "react";
import { onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth } from "../context/firebase-config";

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch user data from Firestore
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));

        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          setStatus("User data not found in Firestore.");
        }
      } else {
        // Redirect if no user is logged in
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription
  }, [navigate]);

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
      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : user ? (
        <div className="profile-card">
          <div className="profile-header">
            <h3>Welcome, {userData ? userData.name : "User"}</h3>
            <p>Email: {user.email}</p>
          </div>
          {userData ? (
            <div className="user-info">
              <p><strong>Name:</strong> {userData.name}</p>
              <p><strong>Age:</strong> {userData.age}</p>
            </div>
          ) : (
            <p>No additional data found.</p>
          )}
          <button onClick={handleResetPassword} className="reset-button">
            Send Password Reset Email
          </button>
          {status && <p className="status-message">{status}</p>}
        </div>
      ) : (
        <p>No user found.</p>
      )}
    </div>
  );
};

export default UserProfile;
