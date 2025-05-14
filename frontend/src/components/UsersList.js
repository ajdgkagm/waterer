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
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));

        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          setStatus("User data not found in Firestore.");
        }
      } else {
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setStatus("✅ Password reset email sent!");
    } catch (error) {
      console.error("Error sending reset email:", error);
      setStatus("❌ Failed to send reset email.");
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">User Profile</h2>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : user ? (
        <div className="card shadow mx-auto" style={{ maxWidth: "500px" }}>
          <div className="card-header bg-primary text-white text-center">
            <h4>Welcome, {userData ? userData.name : "User"}</h4>
          </div>
          <div className="card-body">
            <p><strong>Email:</strong> {user.email}</p>
            {userData ? (
              <>
                <p><strong>Name:</strong> {userData.name}</p>
                <p><strong>Age:</strong> {userData.age}</p>
              </>
            ) : (
              <p className="text-muted">No additional data found.</p>
            )}
            <div className="d-grid mt-3">
              <button className="btn btn-outline-primary" onClick={handleResetPassword}>
                Send Password Reset Email
              </button>
            </div>
            {status && (
              <div className="alert alert-info mt-3 mb-0 text-center" role="alert">
                {status}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="alert alert-warning text-center">
          No user found.
        </div>
      )}
    </div>
  );
};

export default UserProfile;
