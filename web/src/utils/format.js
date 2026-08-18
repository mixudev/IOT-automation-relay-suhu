import { DAY_SHORT } from "../config.js";

// Menit sejak 00:00 -> "HH:MM"
export function minuteToHM(min) {
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return (
    String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0")
  );
}

// "HH:MM" -> menit sejak 00:00
export function hmToMinute(hm) {
  if (!hm || typeof hm !== "string") return 0;
  const parts = hm.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// days array (0..6) -> "Sen-Jum", "Setiap hari", "Sen, Rab"
export function daysLabel(days) {
  const arr = days || [];
  if (arr.length === 0) return "Tanpa hari";
  if (arr.length === 7) return "Setiap hari";

  if (arr.length >= 5) {
    // rentang berurutan
    const sorted = [...arr].sort((a, b) => a - b);
    let contiguous = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) contiguous = false;
    }
    if (contiguous) {
      return DAY_SHORT[sorted[0]] + "-" + DAY_SHORT[sorted[sorted.length - 1]];
    }
  }

  return arr.map((d) => DAY_SHORT[d]).join(", ");
}

// Ringkasan waktu aturan (mulai-akhir, dukung lewat tengah malam)
export function timeRangeLabel(startMin, endMin) {
  if (startMin === endMin) {
    return minuteToHM(startMin);
  }
  return minuteToHM(startMin) + " - " + minuteToHM(endMin);
}

// Detik -> { val, unit } untuk tampilan (pilih satuan paling besar yang rapi)
export function secToParts(sec) {
  const s = sec > 0 ? sec : 0;
  if (s % 3600 === 0) return { val: s / 3600, unit: "jam" };
  if (s % 60 === 0) return { val: s / 60, unit: "menit" };
  return { val: s, unit: "detik" };
}

// { val, unit } -> detik
export function partsToSec(val, unit) {
  const n = Math.max(0, parseInt(val, 10) || 0);
  if (unit === "jam") return n * 3600;
  if (unit === "menit") return n * 60;
  return n;
}

// Ringkasan kondisi satu aturan -> kalimat singkat
export function ruleConditionLabel(r) {
  switch (r.type) {
    case "time":
      return (
        "Setiap " +
        daysLabel(r.days) +
        ", " +
        timeRangeLabel(r.startMin, r.endMin)
      );
    case "temp":
      return (
        "Suhu ≥ " +
        (r.onValue / 10).toFixed(1) +
        "°C nyala, ≤ " +
        (r.offValue / 10).toFixed(1) +
        "°C mati"
      );
    case "timer": {
      const on = secToParts(r.onSec);
      const off = secToParts(r.offSec);
      return (
        "Siklus: nyala " + on.val + " " + on.unit +
        ", mati " + off.val + " " + off.unit
      );
    }
    case "sched_temp":
      return (
        "Setiap " +
        daysLabel(r.days) +
        ", " +
        timeRangeLabel(r.startMin, r.endMin) +
        " & suhu ≥ " +
        (r.onValue / 10).toFixed(1) +
        "°C"
      );
    default:
      return "";
  }
}

// Ringkasan aksi -> "Relay 1, Relay 2"
export function relaysLabel(relays, names) {
  const arr = relays || [];
  if (arr.length === 0) return "Tanpa relay";

  return arr
    .map((r) => {
      const name = names ? names[r - 1] : null;
      return name ? r + " · " + name : "Relay " + r;
    })
    .join(", ");
}

export function fmtTemp(v) {
  if (v === null || typeof v !== "number" || Number.isNaN(v)) return "--.-";
  return v.toFixed(1);
}

export function fmtHum(v) {
  if (v === null || typeof v !== "number" || Number.isNaN(v)) return "--";
  return Math.round(v);
}