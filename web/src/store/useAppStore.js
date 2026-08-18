import { create } from "zustand";
import CFG, { RELAY_COUNT } from "../config.js";
import { publish } from "../mqtt/client.js";

const HISTORY_MAX = 120;

function pushHistory(arr, value) {
  const next = [...arr, value];
  if (next.length > HISTORY_MAX) {
    next.shift();
  }
  return next;
}

export const useAppStore = create((set, get) => ({

  conn: "connecting", // connecting | online | offline (koneksi broker)
  deviceOnline: false, // perangkat benar-benar merespons (heartbeat)
  lastSeen: null,      // timestamp pesan terakhir dari perangkat
  ntpWarning: false,

  relayStates: [false, false, false, false],
  relayModes: [true, true, true, true],
  relayNames: ["Relay 1", "Relay 2", "Relay 3", "Relay 4"],

  temperature: null,
  humidity: null,
  time: null,
  ntpSynced: false,
  rulesActive: 0,

  events: [],       // feed aktivitas (terbaru di depan)
  tempHistory: [],
  humHistory: [],
  lastUpdate: null,

  // ---- status internal ----

  setConn: (conn) => set({ conn }),
  setDeviceOnline: (v) => set({ deviceOnline: v }),
  setNtpWarning: (v) => set({ ntpWarning: v }),

  markSeen: () => set({ lastSeen: Date.now() }),

  applyStatus: (data) => {
    const s = get();

    const relayStates = [];
    for (let i = 1; i <= RELAY_COUNT; i++) {
      relayStates.push(
        typeof data["relay" + i] === "boolean"
          ? data["relay" + i]
          : s.relayStates[i - 1]
      );
    }

    const next = {
      relayStates,
      relayModes: Array.isArray(data.relayModes)
        ? data.relayModes
        : s.relayModes,
      relayNames: Array.isArray(data.relayNames)
        ? data.relayNames
        : s.relayNames,
      temperature:
        typeof data.temperature === "number"
          ? data.temperature
          : s.temperature,
      humidity:
        typeof data.humidity === "number"
          ? data.humidity
          : s.humidity,
      time: data.time || s.time,
      ntpSynced:
        typeof data.ntpSynced === "boolean"
          ? data.ntpSynced
          : s.ntpSynced,
      rulesActive:
        typeof data.rulesActive === "number"
          ? data.rulesActive
          : s.rulesActive,
      lastUpdate: Date.now(),
      lastSeen: Date.now(),
      deviceOnline: true,
    };

    // Taruh sensor ke history juga (jika ada nilai baru).
    if (typeof data.temperature === "number") {
      next.tempHistory = pushHistory(s.tempHistory, data.temperature);
    }
    if (typeof data.humidity === "number") {
      next.humHistory = pushHistory(s.humHistory, data.humidity);
    }

    set(next);
  },

  applySensor: (temperature, humidity) => {
    const s = get();
    set({
      temperature,
      humidity,
      tempHistory: pushHistory(s.tempHistory, temperature),
      humHistory: pushHistory(s.humHistory, humidity),
      lastUpdate: Date.now(),
      lastSeen: Date.now(),
      deviceOnline: true,
    });
  },

  pushEvent: (ev) =>
    set((s) => ({
      events: [ev, ...s.events].slice(0, 60),
      lastSeen: Date.now(),
      deviceOnline: true,
    })),

  clearHistory: () =>
    set({ tempHistory: [], humHistory: [] }),

  clearEvents: () => set({ events: [] }),

  // ---- names/modes dari local cache ----

  setRelayNames: (names) =>
    set({ relayNames: names }),

  setRelayModes: (modes) =>
    set({ relayModes: modes }),

  // ---- ACTION MQTT ----

  requestConfig: () => {
    publish(CFG.topicConfigGet, "{}", 1);
  },

  manualRelay: (number, on) => {
    publish(CFG.topicCommand, {
      relay: number,
      state: on ? "on" : "off",
    });
  },

  setAll: (on) => {
    publish(CFG.topicCommand, { all: on ? "on" : "off" });
  },

  setMode: (number, auto) => {
    publish(CFG.topicCommand, {
      relay: number,
      mode: auto ? "auto" : "manual",
    });
  },

  setRelayName: (number, name) => {
    publish(CFG.topicCommand, {
      relay: number,
      name,
    });
  },

  reboot: () => {
    publish(CFG.topicCommand, { reboot: true });
  },
}));