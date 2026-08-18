// =====================================================
// STATE & UTIL
// =====================================================

const RELAY_COUNT = 4;

const tempHistory = [];
const humHistory = [];

let mqttReady = false;

// =====================================================
// TEMA (LIGHT / DARK)
// =====================================================

function applyThemeColor() {

  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg")
    .trim();

  let meta = document.querySelector('meta[name="theme-color"]');

  if (meta && bg) {
    meta.setAttribute("content", bg);
  }
}

function toggleTheme() {

  const root = document.documentElement;

  const next =
    root.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";

  root.setAttribute("data-theme", next);

  localStorage.setItem("theme", next);

  applyThemeColor();
  drawChart();
}

function setConnection(connected) {

  const dot =
    document.getElementById("dot");

  const label =
    document.getElementById("connection");

  dot.classList.toggle("on", connected);
  dot.classList.toggle("off", !connected);

  label.textContent = connected
    ? "Terhubung"
    : "Terputus";

  mqttReady = connected;

  document.querySelectorAll("button")
    .forEach(function (btn) {
      btn.disabled = !connected;
    });
}

// =====================================================
// RELAY CARDS (dibuat otomatis)
// =====================================================

const relayDescriptions = [
  "Output channel pertama",
  "Output channel kedua",
  "Output channel ketiga",
  "Output channel keempat",
];

function buildRelayCards() {

  const grid =
    document.getElementById("relayGrid");

  for (let i = 1; i <= RELAY_COUNT; i++) {

    const card =
      document.createElement("div");
    card.className = "card";

    card.innerHTML =
      '<div class="card-top">' +
      '<span class="relay-number">Channel ' +
      String(i).padStart(2, "0") +
      "</span>" +
      '<span id="status' + i +
      '" class="status">OFF</span>' +
      "</div>" +
      '<div class="relay-name">Relay ' + i +
      "</div>" +
      '<div class="description">' +
      relayDescriptions[i - 1] + "</div>" +
      '<div class="switch-container">' +
      "<span>Power</span>" +
      '<label class="switch">' +
      '<input type="checkbox" id="relay' + i +
      '" onchange="toggleRelay(' + i + ')">' +
      '<span class="slider"></span>' +
      "</label></div>";

    grid.appendChild(card);
  }
}

// =====================================================
// KONTROL
// =====================================================

function publishCommand(obj) {

  if (!mqttReady) {
    return;
  }

  // QoS 1 supaya perintah tidak hilang saat broker sibuk
  client.publish(
    CFG.topicCommand,
    JSON.stringify(obj),
    { qos: 1 }
  );
}

function toggleRelay(number) {

  const checkbox =
    document.getElementById(
      "relay" + number
    );

  const state =
    checkbox.checked;

  publishCommand({
    relay: number,
    state: state ? "on" : "off",
  });
}

function setAll(state) {

  publishCommand({
    all: state ? "on" : "off",
  });
}

// =====================================================
// TAMPILAN
// =====================================================

function updateStatus(number, state) {

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

  document.getElementById(
    "relay" + number
  ).checked = state;
}

function handleStatusMessage(data) {

  for (let i = 1; i <= RELAY_COUNT; i++) {

    if (
      typeof data["relay" + i] === "boolean"
    ) {
      updateStatus(i, data["relay" + i]);
    }
  }

  if (
    typeof data.temperature === "number"
  ) {
    handleSensorData(
      data.temperature,
      data.humidity
    );
  }
}

function handleSensorData(temp, hum) {

  if (!isNaN(temp)) {

    document.getElementById(
      "temp"
    ).textContent =
      temp.toFixed(1) + "°C";

    tempHistory.push(temp);
  }

  if (!isNaN(hum)) {

    document.getElementById(
      "hum"
    ).textContent =
      hum.toFixed(1) + "%";

    humHistory.push(hum);
  }

  if (tempHistory.length > CFG.historyLimit) {
    tempHistory.shift();
  }

  if (humHistory.length > CFG.historyLimit) {
    humHistory.shift();
  }

  drawChart();
}

// =====================================================
// GRAFIK
// =====================================================

function drawChart() {

  const canvas =
    document.getElementById("tempChart");

  if (!canvas) {
    return;
  }

  const ctx =
    canvas.getContext("2d");

  const w = canvas.width;
  const h = canvas.height;
  const pad = 14;

  ctx.clearRect(0, 0, w, h);

  const rootStyle =
    getComputedStyle(document.documentElement);

  const gridColor =
    rootStyle.getPropertyValue("--chart-grid").trim() ||
    "rgba(128,128,128,0.08)";

  const labelColor =
    rootStyle.getPropertyValue("--chart-label").trim() ||
    "#888";

  const tempColor =
    rootStyle.getPropertyValue("--chart-temp").trim() ||
    "#E8622C";

  const humColor =
    rootStyle.getPropertyValue("--chart-hum").trim() ||
    "#3654F0";

  // Grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {

    const y =
      pad + (i / 4) * (h - pad * 2);

    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  // Label sumbu Y
  ctx.fillStyle = labelColor;
  ctx.font = "10px sans-serif";

  ctx.textAlign = "left";
  ctx.fillText("50°C", 2, pad + 10);
  ctx.fillText("0°C", 2, h - pad);

  ctx.textAlign = "right";
  ctx.fillText("100%", w - 2, pad + 10);
  ctx.fillText("0%", w - 2, h - pad);

  function mapY(value, max, invert) {

    const range = h - pad * 2;

    const raw =
      pad + (1 - value / max) * range;

    return invert
      ? (pad + (value / max) * range)
      : raw;
  }

  function drawLine(data, color, max, invert) {

    if (data.length < 2) {
      return;
    }

    const step =
      (w - pad * 2) /
      (CFG.historyLimit - 1);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {

      const x = pad + i * step;
      const y = mapY(data[i], max, invert);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  drawLine(tempHistory, tempColor, 50, false);
  drawLine(humHistory, humColor, 100, true);
}

// =====================================================
// MQTT
// =====================================================

const connOpts = {
  clientId:
    "web_" + Math.random().toString(16).substring(2, 10),
  connectTimeout: 15000,
  reconnectPeriod: 3000,
  keepalive: 60,
};

if (CFG.mqttUsername) {
  connOpts.username = CFG.mqttUsername;
  connOpts.password = CFG.mqttPassword || "";
}

const client = mqtt.connect(
  CFG.brokerUrl,
  connOpts
);

client.on("connect", function () {

  setConnection(true);

  client.subscribe(CFG.topicStatus);
  client.subscribe(CFG.topicSensor);
});

client.on("message", function (topic, message) {

  const t = topic.toString();

  const str = message.toString();

  let data = null;

  try {
    data = JSON.parse(str);
  } catch (e) {
    return;
  }

  if (t === CFG.topicStatus) {
    handleStatusMessage(data);
  } else if (t === CFG.topicSensor) {

    handleSensorData(
      data.temperature,
      data.humidity
    );
  }
});

client.on("close", function () {
  setConnection(false);
});

client.on("error", function () {
  setConnection(false);
});

// =====================================================
// INIT
// =====================================================

buildRelayCards();

applyThemeColor();

setInterval(drawChart, 1000);

setConnection(false);

drawChart();