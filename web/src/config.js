import CFG from "../config.gen.js";

// Config ter-generate (broker, kredensial, deviceId, topik).
export default CFG;

export const RELAY_COUNT = 4;

export const RULE_TYPES = {
  time: { label: "Waktu", short: "Jadwal" },
  temp: { label: "Suhu", short: "Suhu" },
  hum: { label: "Kelembapan", short: "Lembap" },
  sched_temp: { label: "Waktu + Suhu", short: "Kombinasi" },
};

export const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export const TYPE_COLOR = {
  time: "blue",
  temp: "orange",
  hum: "green",
  sched_temp: "gradient",
};