import React, { useEffect, useState } from "react";
import axios from "axios";
import "../App.css"; // Import CSS file

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("http://localhost:5000/users") // Backend API URL
      .then(response => {
        setUsers(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching users:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="users-container">
      <h2>Registered Users</h2>
      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Email</th>
              <th>Name</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid}>
                <td>{user.uid}</td>
                <td>{user.email}</td>
                <td>{user.displayName || "N/A"}</td>
                <td>{new Date(user.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsersList;
