#!/usr/bin/env node
// ===========================================================
// build-config.js
// Mengubah web/config.template.js menjadi config.gen.js
// dengan nilai dari:
//   1. environment variable (prioritas tertinggi) -> dipakai Vercel
//   2. file .env (local dev: web/.env, then parent .env)
// ===========================================================

const fs = require("fs");
const path = require("path");

// ---- Baca .env (parser minimal, tanpa dependency) ----
function loadEnvFile(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;

  const txt = fs.readFileSync(p, "utf8");

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();

    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }

    out[k] = v;
  }

  return out;
}

// ---- Kumpulkan sumber nilai ----
const cwd = process.cwd();
const webDir = path.join(__dirname, "..");        // .../web
const projectRoot = path.join(__dirname, "..", ".."); // root proyek

const env = {};

// .env lokal: web/scripts, web/, root proyek, dan satu tingkat di atas
for (const base of [
  cwd,
  path.join(__dirname, ".."),
  projectRoot,
  path.join(projectRoot, ".."),
]) {
  Object.assign(env, loadEnvFile(path.join(base, ".env")));
}

// environment variable (Vercel deploy) menimpa .env
for (const key of Object.keys(process.env)) {
  const val = process.env[key];
  if (val !== undefined && val !== "") {
    env[key] = val;
  }
}

// ---- Nilai akhir ----
const get = (name, def) => (env[name] && env[name].trim() ? env[name].trim() : def);

const DEVICE_ID = get("DEVICE_ID", "iot_default");
const MQTT_BROKER_URL = get(
  "MQTT_BROKER_URL",
  env.MQTT_HOST
    ? `wss://${env.MQTT_HOST}:8884/mqtt`
    : "__MQTT_BROKER_URL__"
);
const MQTT_USERNAME = get("MQTT_USER", get("MQTT_USERNAME", ""));
const MQTT_PASSWORD = get("MQTT_PASS", get("MQTT_PASSWORD", ""));

// ---- Generate ----
const templatePath =
  path.join(webDir, "config.template.js");

const outPath =
  path.join(webDir, "config.gen.js");

let out = fs.readFileSync(templatePath, "utf8");

out = out
  .split("__MQTT_BROKER_URL__").join(MQTT_BROKER_URL)
  .split("__MQTT_USERNAME__").join(MQTT_USERNAME)
  .split("__MQTT_PASSWORD__").join(MQTT_PASSWORD)
  .split("__DEVICE_ID__").join(DEVICE_ID);

const banner =
  "// ===========================================================\n" +
  "// FILE DI-GENERATE OTOMATIS oleh scripts/build-config.js\n" +
  "// dari env/.env. JANGAN di-edit manual & JANGAN di-commit.\n" +
  "// ===========================================================\n\n";

fs.writeFileSync(outPath, banner + out, "utf8");

console.log(`[OK] ${outPath}`);
console.log(`  brokerUrl : ${MQTT_BROKER_URL}`);
console.log(`  user      : ${MQTT_USERNAME ? "***" : "(kosong)"}`);
console.log(`  deviceId  : ${DEVICE_ID}`);
console.log(
  "  source    : " +
  (Object.keys(process.env).some(e => e.startsWith("MQTT")) ||
   Object.keys(process.env).includes("DEVICE_ID")
    ? "environment variable"
    : ".env file")
);