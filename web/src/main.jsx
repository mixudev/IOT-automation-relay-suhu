import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./globals.css";
import { startRouting } from "./mqtt/router.js";
import { mqttConnect } from "./mqtt/client.js";
import { useAppStore } from "./store/useAppStore.js";
import { DEVICE_OFFLINE_AFTER_MS, DEVICE_CHECK_INTERVAL_MS } from "./config.js";

// Init MQTT + routing sebelum render pertama.
startRouting();
mqttConnect();

useAppStore.getState().requestConfig();

// Watchdog kehadiran perangkat: bila tidak ada pesan dari ESP selama
// DEVICE_OFFLINE_AFTER_MS, semua fitur dikunci sampai perangkat kembali.
const checkDevice = () => {
  const s = useAppStore.getState();
  const dead =
    !s.lastSeen || Date.now() - s.lastSeen > DEVICE_OFFLINE_AFTER_MS;
  const online = s.conn === "online" && !dead;
  if (s.deviceOnline !== online) s.setDeviceOnline(online);
};

checkDevice();
setInterval(checkDevice, DEVICE_CHECK_INTERVAL_MS);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);