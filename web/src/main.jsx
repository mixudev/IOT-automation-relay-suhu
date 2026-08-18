import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./globals.css";
import { startRouting } from "./mqtt/router.js";
import { mqttConnect } from "./mqtt/client.js";
import { useAppStore } from "./store/useAppStore.js";

// Init MQTT + routing sebelum render pertama.
startRouting();
mqttConnect();

useAppStore.getState().requestConfig();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);