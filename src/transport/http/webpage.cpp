#include "webpage.h"

const char INDEX_HTML[] PROGMEM = R"rawliteral(

<!DOCTYPE html>
<html lang="id">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>ESP8266 Relay Controller</title>

<style>

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Arial,
    sans-serif;

  background:
    radial-gradient(
      circle at top,
      #1b1b1b 0%,
      #0b0b0b 45%,
      #050505 100%
    );

  color: #ffffff;

  min-height: 100vh;

  padding: 20px;
}

.container {
  width: 100%;
  max-width: 900px;
  margin: auto;
}

/* HEADER */

.header {
  margin-bottom: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 44px;
  height: 44px;

  border-radius: 12px;

  background: #ffffff;
  color: #000000;

  display: flex;
  align-items: center;
  justify-content: center;

  font-weight: 800;
  font-size: 20px;
}

.title {
  font-size: 24px;
  font-weight: 700;
}

.subtitle {
  color: #888;
  margin-top: 3px;
  font-size: 14px;
}

/* CONNECTION */

.connection {
  display: flex;
  align-items: center;
  gap: 8px;

  margin-top: 16px;

  color: #aaa;
  font-size: 13px;
}

.dot {
  width: 9px;
  height: 9px;

  border-radius: 50%;

  background: #22c55e;

  box-shadow:
    0 0 12px rgba(34, 197, 94, 0.7);
}

/* SENSOR */

.sensor {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 14px;

  margin-bottom: 14px;
}

.sensor-card {
  background: rgba(255,255,255,0.055);

  border:
    1px solid rgba(255,255,255,0.08);

  border-radius: 18px;

  padding: 18px 20px;
}

.sensor-values {
  display: flex;
  gap: 24px;

  margin-top: 14px;
}

.sensor-value {
  font-size: 28px;
  font-weight: 700;

  color: #4ade80;
}

.sensor-label {
  color: #777;
  font-size: 12px;
  margin-top: 2px;

  text-transform: uppercase;
  letter-spacing: 1px;
}

.legend {
  font-size: 12px;
  color: #aaa;
}

.chart-card {
  grid-column: 1 / -1;

  background: rgba(255,255,255,0.055);

  border:
    1px solid rgba(255,255,255,0.08);

  border-radius: 18px;

  padding: 18px 20px;
}

.chart-card canvas {
  width: 100%;
  height: auto;

  display: block;
}

/* GRID */

.grid {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 14px;
}

/* CARD */

.card {
  background: rgba(255,255,255,0.055);

  border:
    1px solid rgba(255,255,255,0.08);

  border-radius: 18px;

  padding: 20px;

  backdrop-filter: blur(12px);

  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);

  border-color:
    rgba(255,255,255,0.18);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 25px;
}

.relay-number {
  font-size: 13px;

  color: #888;

  text-transform: uppercase;

  letter-spacing: 1px;
}

.status {
  font-size: 12px;

  padding: 5px 9px;

  border-radius: 999px;

  background: #222;

  color: #888;
}

.status.on {
  background:
    rgba(34,197,94,0.12);

  color: #4ade80;
}

.relay-name {
  font-size: 20px;

  font-weight: 650;

  margin-bottom: 6px;
}

.description {
  color: #777;

  font-size: 13px;

  margin-bottom: 20px;
}

/* SWITCH */

.switch-container {
  display: flex;

  align-items: center;

  justify-content: space-between;
}

.switch {
  position: relative;

  width: 62px;
  height: 34px;
}

.switch input {
  opacity: 0;

  width: 0;
  height: 0;
}

.slider {
  position: absolute;

  cursor: pointer;

  inset: 0;

  background: #292929;

  border-radius: 999px;

  transition: 0.25s;
}

.slider:before {
  content: "";

  position: absolute;

  width: 26px;
  height: 26px;

  left: 4px;
  top: 4px;

  background: #888;

  border-radius: 50%;

  transition: 0.25s;
}

input:checked + .slider {
  background: #22c55e;
}

input:checked + .slider:before {
  transform: translateX(28px);

  background: #ffffff;
}

/* ACTIONS */

.actions {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 12px;

  margin-top: 16px;
}

button {
  border: none;

  border-radius: 14px;

  padding: 15px;

  font-size: 14px;

  font-weight: 600;

  cursor: pointer;

  transition:
    transform 0.15s,
    opacity 0.15s;
}

button:active {
  transform: scale(0.97);
}

.btn-on {
  background: #ffffff;
  color: #000000;
}

.btn-off {
  background: #222;
  color: #ffffff;

  border:
    1px solid rgba(255,255,255,0.08);
}

button:hover {
  opacity: 0.85;
}

/* FOOTER */

.footer {
  text-align: center;

  color: #555;

  font-size: 12px;

  margin-top: 28px;
}

/* MOBILE */

@media (max-width: 600px) {

  body {
    padding: 14px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .sensor {
    grid-template-columns: 1fr;
  }

  .title {
    font-size: 21px;
  }

  .card {
    padding: 18px;
  }

}

</style>

</head>

<body>

<div class="container">

  <div class="header">

    <div class="brand">

      <div class="logo">
        R
      </div>

      <div>

        <div class="title">
          Relay Controller
        </div>

        <div class="subtitle">
          ESP8266 • 4 Channel
        </div>

      </div>

    </div>

    <div class="connection">

      <div class="dot"></div>

      <span id="connection">
        Connected
      </span>

    </div>

  </div>


  <div class="sensor">

    <div class="sensor-card">

      <div class="card-top">

        <span class="relay-number">
          Sensor
        </span>

        <span class="status">
          DHT22
        </span>

      </div>

      <div class="sensor-values">

        <div>

          <div
            id="temp"
            class="sensor-value"
          >
            --.-°C
          </div>

          <div class="sensor-label">
            Suhu
          </div>

        </div>

        <div>

          <div
            id="hum"
            class="sensor-value"
          >
            --%
          </div>

          <div class="sensor-label">
            Kelembapan
          </div>

        </div>

      </div>

    </div>

    <div class="sensor-card">

      <div class="card-top">

        <span class="relay-number">
          Grafik
        </span>

        <span class="status">
          Real-time
        </span>

      </div>

      <div class="sensor-values">

        <div>

          <span
            class="legend"
            style="color:#4ade80"
          >
            ■ Suhu (°C)
          </span>

        </div>

        <div>

          <span
            class="legend"
            style="color:#60a5fa"
          >
            ■ Kelembapan (%)
          </span>

        </div>

      </div>

    </div>

    <div class="chart-card">

      <canvas
        id="tempChart"
        width="700"
        height="200"
      ></canvas>

    </div>

  </div>


  <div class="grid">

    <!-- RELAY 1 -->

    <div class="card">

      <div class="card-top">

        <span class="relay-number">
          Channel 01
        </span>

        <span
          id="status1"
          class="status"
        >
          OFF
        </span>

      </div>

      <div class="relay-name">
        Relay 1
      </div>

      <div class="description">
        Output channel pertama
      </div>

      <div class="switch-container">

        <span>
          Power
        </span>

        <label class="switch">

          <input
            type="checkbox"
            id="relay1"
            onchange="toggleRelay(1)"
          >

          <span class="slider"></span>

        </label>

      </div>

    </div>


    <!-- RELAY 2 -->

    <div class="card">

      <div class="card-top">

        <span class="relay-number">
          Channel 02
        </span>

        <span
          id="status2"
          class="status"
        >
          OFF
        </span>

      </div>

      <div class="relay-name">
        Relay 2
      </div>

      <div class="description">
        Output channel kedua
      </div>

      <div class="switch-container">

        <span>
          Power
        </span>

        <label class="switch">

          <input
            type="checkbox"
            id="relay2"
            onchange="toggleRelay(2)"
          >

          <span class="slider"></span>

        </label>

      </div>

    </div>


    <!-- RELAY 3 -->

    <div class="card">

      <div class="card-top">

        <span class="relay-number">
          Channel 03
        </span>

        <span
          id="status3"
          class="status"
        >
          OFF
        </span>

      </div>

      <div class="relay-name">
        Relay 3
      </div>

      <div class="description">
        Output channel ketiga
      </div>

      <div class="switch-container">

        <span>
          Power
        </span>

        <label class="switch">

          <input
            type="checkbox"
            id="relay3"
            onchange="toggleRelay(3)"
          >

          <span class="slider"></span>

        </label>

      </div>

    </div>


    <!-- RELAY 4 -->

    <div class="card">

      <div class="card-top">

        <span class="relay-number">
          Channel 04
        </span>

        <span
          id="status4"
          class="status"
        >
          OFF
        </span>

      </div>

      <div class="relay-name">
        Relay 4
      </div>

      <div class="description">
        Output channel keempat
      </div>

      <div class="switch-container">

        <span>
          Power
        </span>

        <label class="switch">

          <input
            type="checkbox"
            id="relay4"
            onchange="toggleRelay(4)"
          >

          <span class="slider"></span>

        </label>

      </div>

    </div>

  </div>


  <div class="actions">

    <button
      class="btn-on"
      onclick="setAll(true)"
    >
      ALL ON
    </button>

    <button
      class="btn-off"
      onclick="setAll(false)"
    >
      ALL OFF
    </button>

  </div>


  <div class="footer">

    ESP8266 Local Relay Controller

  </div>

</div>


<script>

const ACCESS_KEY = "{{KEY}}";

function keyParam() {
  return (ACCESS_KEY && ACCESS_KEY !== "{{KEY}}")
    ? "?key=" + encodeURIComponent(ACCESS_KEY)
    : "";
}

async function toggleRelay(number) {

  const checkbox =
    document.getElementById(
      "relay" + number
    );

  const state =
    checkbox.checked;

  try {

    await fetch(
      "/relay/" +
      number +
      "/" +
      (state ? "on" : "off") +
      keyParam()
    );

    updateStatus(
      number,
      state
    );

  } catch (error) {

    checkbox.checked = !state;

    setConnection(false);

  }

}


async function setAll(state) {

  try {

    await fetch(
      "/all/" +
      (state ? "on" : "off") +
      keyParam()
    );

    for (
      let i = 1;
      i <= 4;
      i++
    ) {

      document.getElementById(
        "relay" + i
      ).checked = state;

      updateStatus(
        i,
        state
      );

    }

  } catch (error) {

    setConnection(false);

  }

}


function updateStatus(
  number,
  state
) {

  const status =
    document.getElementById(
      "status" + number
    );

  status.textContent =
    state ? "ON" : "OFF";

  status.classList.toggle(
    "on",
    state
  );

}


function setConnection(
  connected
) {

  const element =
    document.getElementById(
      "connection"
    );

  element.textContent =
    connected
      ? "Connected"
      : "Disconnected";

}


async function loadStatus() {

  try {

    const response =
      await fetch("/status");

    const data =
      await response.json();

    for (
      let i = 1;
      i <= 4;
      i++
    ) {

      const state =
        data["relay" + i];

      document.getElementById(
        "relay" + i
      ).checked = state;

      updateStatus(
        i,
        state
      );

    }

    setConnection(true);

  } catch (error) {

    setConnection(false);

  }

}


loadStatus();

// Poll status berkala supaya perubahan dari automation/MQTT tampil
// tanpa perlu reload halaman.
setInterval(
  loadStatus,
  5000
);


// =====================================================
// SENSOR & GRAFIK
// =====================================================

const historyLimit = 60;

const tempHistory = [];
const humHistory = [];


function drawChart() {

  const canvas =
    document.getElementById(
      "tempChart"
    );

  const ctx =
    canvas.getContext("2d");

  const w = canvas.width;
  const h = canvas.height;
  const pad = 14;

  ctx.clearRect(
    0,
    0,
    w,
    h
  );

  // Garis grid
  ctx.strokeStyle =
    "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;

  for (
    let i = 0;
    i <= 4;
    i++
  ) {

    const y =
      pad + (i / 4) *
      (h - pad * 2);

    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  // Label sumbu Y
  ctx.fillStyle = "#777";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";

  ctx.fillText(
    "50°C",
    2,
    pad + 10
  );

  ctx.fillText(
    "0°C",
    2,
    h - pad
  );

  ctx.textAlign = "right";

  ctx.fillText(
    "100%",
    w - 2,
    pad + 10
  );

  ctx.fillText(
    "0%",
    w - 2,
    h - pad
  );

  // Fungsi pemetaan
  function mapY(
    value,
    max,
    invert
  ) {

    const range =
      h - pad * 2;

    const raw =
      pad + (1 - value / max) *
      range;

    return invert
      ? (pad + value / max * range)
      : raw;
  }

  function drawLine(
    data,
    color,
    max,
    invert
  ) {

    if (
      data.length < 2
    ) {
      return;
    }

    const step =
      (w - pad * 2) /
      (historyLimit - 1);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();

    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      const x =
        pad + i * step;

      const y =
        mapY(
          data[i],
          max,
          invert
        );

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  // Suhu : 0..60°C (rentang valid DHT22)
  // Hum  : 0..100% (invert = pakai skala dari bawah)
  drawLine(
    tempHistory,
    "#4ade80",
    60,
    false
  );

  drawLine(
    humHistory,
    "#60a5fa",
    100,
    true
  );

}


function loadSensor() {

  fetch("/sensor")

    .then(function (res) {
      return res.json();
    })

    .then(function (data) {

      const t =
        parseFloat(
          data.temperature
        );

      const h =
        parseFloat(
          data.humidity
        );

      if (!isNaN(t)) {

        document.getElementById(
          "temp"
        ).textContent =
          t.toFixed(1) + "°C";

        tempHistory.push(t);
      }

      if (!isNaN(h)) {

        document.getElementById(
          "hum"
        ).textContent =
          h.toFixed(1) + "%";

        humHistory.push(h);
      }

      if (
        tempHistory.length >
        historyLimit
      ) {
        tempHistory.shift();
      }

      if (
        humHistory.length >
        historyLimit
      ) {
        humHistory.shift();
      }

      drawChart();

    })

    .catch(function () {
      // abaikan jika sensor belum tersedia
    });

}


setInterval(
  loadSensor,
  2000
);

loadSensor();

</script>

</body>

</html>

)rawliteral";