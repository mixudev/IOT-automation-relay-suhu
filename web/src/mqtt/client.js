import mqtt from "mqtt";
import CFG from "../config.js";

// =====================================================
// MQTT CLIENT (singleton) — WSS ke HiveMQ Cloud
// =====================================================

let client = null;
let subIds = [];

const listeners = new Set();
const connListeners = new Set();

export function onMqttMessage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onConnChange(fn) {
  connListeners.add(fn);
  return () => connListeners.delete(fn);
}

export function publish(topic, obj, qos = 1) {
  if (!client || !client.connected) {
    return false;
  }

  const payload =
    typeof obj === "string" ? obj : JSON.stringify(obj);

  client.publish(topic, payload, { qos });

  return true;
}

export function getClient() {
  return client;
}

export function isConnected() {
  return !!client && client.connected;
}

export function subscribe(topics, onReady) {
  if (!client) {
    return;
  }

  const arr = Array.isArray(topics) ? topics : [topics];

  arr.forEach((t) => {
    client.subscribe(t, (err) => {
      if (!err && onReady) {
        onReady();
      }
    });
  });
}

export function mqttConnect() {

  if (client) {
    return client;
  }

  const opts = {
    clientId:
      "web_" + Math.random().toString(16).substring(2, 10),
    connectTimeout: 15000,
    reconnectPeriod: 3000,
    keepalive: 60,
    clean: true,
  };

  if (CFG.mqttUsername) {
    opts.username = CFG.mqttUsername;
    opts.password = CFG.mqttPassword || "";
  }

  client = mqtt.connect(CFG.brokerUrl, opts);

  client.on("message", (topic, message) => {

    const t = topic.toString();
    const str = message.toString();

    const data = {};

    try {
      const parsed = JSON.parse(str);

      Object.assign(data, parsed);

      data._json = parsed;
    } catch {
      data._raw = str;
    }

    listeners.forEach((fn) => fn(t, data));
  });

  client.on("connect", () => {
    console.log("[mqtt] connected");

    subscribe([
      CFG.topicStatus,
      CFG.topicSensor,
      CFG.topicConfigResp,
      CFG.topicEvent,
    ]);

    connListeners.forEach((fn) => fn(true));
  });

  client.on("close", () => {
    console.log("[mqtt] closed");
    connListeners.forEach((fn) => fn(false));
  });

  client.on("error", (err) => {
    console.warn("[mqtt] error", err.message);
    connListeners.forEach((fn) => fn(false));
  });

  return client;
}

// =====================================================
// Helper topik (diambil dari config.gen.js)
// =====================================================

export { CFG };