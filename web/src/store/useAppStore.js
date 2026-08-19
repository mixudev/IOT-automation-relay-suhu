import { create } from "zustand";
import CFG, { RELAY_COUNT } from "../config.js";
import { publish } from "../mqtt/client.js";
import { toast } from "sonner";

const HISTORY_MAX = 120;
const HISTORY_KEY = "iot.relay.history.v1";

// Muat riwayat yang dipersist di browser (anti-hilang saat refresh).
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (p) =>
          p &&
          typeof p.ts === "number" &&
          typeof p.temp === "number" &&
          typeof p.hum === "number"
      )
      .slice(-HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // kuota penuh / mode privat — abaikan saja
  }
}

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
  history: loadHistory(), // titik sensor rata-rata per jam {ts, temp, hum, n}
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
      relayModes:
        Array.isArray(data.relayModes) && data.relayModes.length === RELAY_COUNT
          ? data.relayModes
          : s.relayModes,
      relayNames:
        Array.isArray(data.relayNames) && data.relayNames.length === RELAY_COUNT
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

  // ---- ACTION MQTT ----
  // Semua aksi memeriksa return publish() dan memberi umpan balik
  // yang jujur ke user; relay di-update optimistically supaya UI
  // terasa responsif (status MQTT berikutnya akan mengonfirmasi).

  requestConfig: () => {
    publish(CFG.topicConfigGet, "{}", 1);
  },

  manualRelay: (number, on) => {
    const s = get();
    const ok = publish(CFG.topicCommand, {
      relay: number,
      state: on ? "on" : "off",
    });

    if (!ok) {
      toast.error("Tidak terhubung ke broker — perintah tidak terkirim");
      return false;
    }

    const relayStates = s.relayStates.slice();
    relayStates[number - 1] = on;
    set({ relayStates });

    return true;
  },

  setAll: (on) => {
    const ok = publish(CFG.topicCommand, { all: on ? "on" : "off" });
    if (!ok) {
      toast.error("Tidak terhubung ke broker — perintah tidak terkirim");
      return false;
    }
    const relayStates = Array(RELAY_COUNT).fill(on);
    set({ relayStates });
    return true;
  },

  setMode: (number, auto) => {
    const s = get();
    const ok = publish(CFG.topicCommand, {
      relay: number,
      mode: auto ? "auto" : "manual",
    });

    if (!ok) {
      toast.error("Tidak terhubung ke broker — perintah tidak terkirim");
      return false;
    }

    const relayModes = s.relayModes.slice();
    relayModes[number - 1] = auto;
    set({ relayModes });

    return true;
  },

  setRelayName: (number, name) => {
    const ok = publish(CFG.topicCommand, {
      relay: number,
      name,
    });

    if (!ok) {
      toast.error("Tidak terhubung ke broker — nama tidak terkirim");
      return false;
    }

    const s = get();
    const relayNames = s.relayNames.slice();
    relayNames[number - 1] = name;
    set({ relayNames });

    return true;
  },

  reboot: () => {
    const ok = publish(CFG.topicCommand, { reboot: true });
    if (!ok) {
      toast.error("Tidak terhubung ke broker — perintah tidak terkirim");
      return false;
    }
    return true;
  },
}));

// Persist riwayat sensor ke localStorage setiap kali berubah —
// grafik tidak hilang saat browser di-refresh.
useAppStore.subscribe((s, prev) => {
  if (s.history !== prev.history) {
    saveHistory(s.history);
  }
});