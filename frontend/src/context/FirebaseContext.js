import React, { createContext, useEffect, useState } from "react";
import { database } from "./firebase-config"; // Ensure correct import
import { ref, onValue } from "firebase/database"; // Import correctly for Realtime Database

export const FirebaseContext = createContext();

export const FirebaseProvider = ({ children }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const dataRef = ref(database, "sensorData"); // ✅ Ensure "database" is passed here
    onValue(dataRef, (snapshot) => {
      setData(snapshot.val());
    });
  }, []);

  return (
    <FirebaseContext.Provider value={{ data }}>
      {children}
    </FirebaseContext.Provider>
  );
};
