import { create } from "zustand";
import CFG, { RELAY_COUNT } from "../config.js";
import { publish } from "../mqtt/client.js";

const HISTORY_MAX = 120;

// Catat pembacaan sensor ke bucket per jam (nilai rata-rata).
// Tidak menumpuk: hanya 1 titik per jam, maksimum HISTORY_MAX
// titik (kurang lebih 5 hari). Titik terakhir di jam yang sama
// dihitung rata-ratanya.
function recordPoint(history, temp, hum, ts) {
  if (typeof temp !== "number" || typeof hum !== "number") {
    return history;
  }

  const hourStart = ts - (ts % 3600000);
  const last = history[history.length - 1];

  if (last && last.ts === hourStart) {
    const n = last.n + 1;
    const point = {
      ts: hourStart,
      n,
      temp: (last.temp * last.n + temp) / n,
      hum: (last.hum * last.n + hum) / n,
    };
    return [...history.slice(0, -1), point];
  }

  const next = [...history, { ts: hourStart, n: 1, temp, hum }];
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
  history: [],      // titik sensor rata-rata per jam {ts, temp, hum, n}
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

    // Taruh sensor ke history (bucket per jam) bila nilai valid.
    if (
      typeof data.temperature === "number" &&
      typeof data.humidity === "number"
    ) {
      next.history = recordPoint(
        s.history,
        data.temperature,
        data.humidity,
        Date.now()
      );
    }

    set(next);
  },

  applySensor: (temperature, humidity) => {
    const s = get();
    set({
      temperature,
      humidity,
      history: recordPoint(s.history, temperature, humidity, Date.now()),
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
    set({ history: [] }),

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