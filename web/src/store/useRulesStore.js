import { create } from "zustand";
import { publish } from "../mqtt/client.js";
import CFG from "../config.js";

// =====================================================
// ATURAN (RULE) — sumber kebenaran ada di ESP8266.
// Web hanya cache & editor; setiap perubahan dikirim
// via MQTT config/set, lalu ESP balas config/resp
// (di-handle router -> applyConfig).
// =====================================================

let localIdCounter = 100;

export const useRulesStore = create((set, get) => ({

  rules: [],
  syncState: "idle", // idle | fetching | saving | error
  pendingAction: null, // null | save
  lastError: null,
  timer: null,

  // ---- dari router (config/resp) ----

  applyConfig: (data) => {
    const rules = Array.isArray(data.rules) ? data.rules : [];

    set({
      rules: rules.map((r) => ({
        id: typeof r.id === "number" ? r.id : 0,
        name: typeof r.name === "string" ? r.name : "",
        enabled: r.enabled !== false,
        relays: Array.isArray(r.relays) ? r.relays : [],
        type: ["time", "temp", "hum", "sched_temp"].includes(r.type)
          ? r.type
          : "time",
        days: Array.isArray(r.days) ? r.days : [],
        startMin: r.startMin || 0,
        endMin: r.endMin || 0,
        onValue: r.onValue || 0,
        offValue: r.offValue || 0,
        priority: r.priority || 0,
        cooldownSec: r.cooldownSec || 0,
      })),
      syncState: "idle",
      lastError: null,
    });
  },

  setPendingAction: (a) => set({ pendingAction: a }),

  // ---- mutasi lokal (optimistic, langsung simpan) ----

  addRule: (rule) => {
    const s = get();
    const id = localIdCounter++;
    set({
      rules: [...s.rules, { ...rule, id }],
    });
    s.save();
  },

  updateRule: (idx, patch) => {
    const s = get();
    const rules = s.rules.map((r, i) =>
      i === idx ? { ...r, ...patch } : r
    );
    set({ rules });
    s.save();
  },

  toggleRule: (idx) => {
    const s = get();
    const rule = s.rules[idx];
    if (!rule) return;
    s.updateRule(idx, { enabled: !rule.enabled });
  },

  removeRule: (idx) => {
    const s = get();
    set({
      rules: s.rules.filter((_, i) => i !== idx),
    });
    s.save();
  },

  dupRule: (idx) => {
    const s = get();
    const rule = s.rules[idx];
    if (!rule) return;
    set({ rules: [...s.rules, { ...rule, id: localIdCounter++ }] });
    s.save();
  },

  // ---- publish ke ESP ----

  save: () => {
    const s = get();

    const payload = {
      v: 1,
      rules: s.rules.map((r) => ({
        id: r.id,
        name: r.name || "",
        enabled: r.enabled,
        relays: Array.isArray(r.relays) ? r.relays : [],
        type: r.type,
        days: r.days || [],
        startMin: r.startMin || 0,
        endMin: r.endMin || 0,
        onValue: r.onValue || 0,
        offValue: r.offValue || 0,
        priority: r.priority || 0,
        cooldownSec: r.cooldownSec || 0,
      })),
    };

    const ok = publish(CFG.topicConfigSet, payload, 1);

    if (!ok) {
      set({ syncState: "error", lastError: "MQTT belum terhubung" });
      return;
    }

    clearTimeout(s.timer);

    const timer = setTimeout(() => {
      if (get().syncState === "saving") {
        set({ syncState: "error", lastError: "Timeout menunggu balasan ESP" });
        get()._clearTimer();
      }
    }, 9000);

    set({ syncState: "saving", pendingAction: "save", timer });
  },

  // ---- sinkron read ----

  fetch: () => {
    const s = get();
    const ok = publish(CFG.topicConfigGet, "{}", 1);

    if (!ok) {
      return;
    }

    clearTimeout(s.timer);

    const timer = setTimeout(() => {
      if (get().syncState === "fetching") {
        set({ syncState: "idle" });
        get()._clearTimer();
      }
    }, 8000);

    set({ syncState: "fetching", timer });
  },

  _clearTimer: () => {
    const cur = get();
    if (cur.timer) {
      clearTimeout(cur.timer);
    }
    set({ timer: null });
  },
}));