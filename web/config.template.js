// =====================================================
// TEMPLATE - jangan diedit manual.
// scripts/build-config.js akan mengubah placeholder ini
// menjadi nilai dari env (Vercel) / .env (lokal) dan
// menulis hasilnya ke config.gen.js (sudah di-gitignore).
// =====================================================

const CFG = {
  brokerUrl: "__MQTT_BROKER_URL__",
  mqttUsername: "__MQTT_USERNAME__",
  mqttPassword: "__MQTT_PASSWORD__",
  deviceId: "__DEVICE_ID__",
  historyLimit: 60,
};

// Topik MQTT otomatis dari deviceId
CFG.topicCommand = CFG.deviceId + "/command";
CFG.topicStatus = CFG.deviceId + "/status";
CFG.topicSensor = CFG.deviceId + "/sensor";
CFG.topicConfigSet = CFG.deviceId + "/config/set";
CFG.topicConfigGet = CFG.deviceId + "/config/get";
CFG.topicConfigResp = CFG.deviceId + "/config/resp";
CFG.topicEvent = CFG.deviceId + "/event";

export default CFG;