#include "mqttclient.h"
#include "config/config.h"
#include "hardware/relay/relay.h"
#include "hardware/sensor/sensor.h"
#include "serialization/status/status.h"
#include "services/automation/automation.h"
#include "services/time/timeSync.h"
#include "services/wifi/wifi.h"
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =====================================================
// TOPIK
// =====================================================

const String TOPIC_COMMAND =
  String(DEVICE_ID) + "/command";
const String TOPIC_STATUS =
  String(DEVICE_ID) + "/status";
const String TOPIC_SENSOR =
  String(DEVICE_ID) + "/sensor";

const String TOPIC_CONFIG_SET =
  String(DEVICE_ID) + "/config/set";
const String TOPIC_CONFIG_GET =
  String(DEVICE_ID) + "/config/get";
const String TOPIC_CONFIG_RESP =
  String(DEVICE_ID) + "/config/resp";
const String TOPIC_EVENT =
  String(DEVICE_ID) + "/event";

// =====================================================
// CLIENT
// =====================================================

WiFiClientSecure mqttWifiClient;
PubSubClient mqtt(mqttWifiClient);

uint32_t lastMqttPublish = 0;
uint32_t lastMqttReconnect = 0;

const uint32_t MQTT_RECONNECT_MS = 5000;

uint8_t lastRelayBits = 0xFF; // dipaksa publish yang pertama

// Buffer aturan statis (bukan di stack) untuk memproses config/set.
// Aman karena handler berjalan single-threaded di main loop.
static AutomationRule cfgRules[MAX_RULES];

uint8_t readRelayBits() {

  uint8_t bits = 0;

  for (uint8_t i = 0; i < RELAY_COUNT; i++) {
    if (getRelayState(i)) {
      bits |= (1 << i);
    }
  }

  return bits;
}

void publishStatus() {

  if (!mqtt.connected()) {
    return;
  }

  mqtt.publish(
    TOPIC_STATUS.c_str(),
    buildStatusJSON().c_str()
  );

  mqtt.publish(
    TOPIC_SENSOR.c_str(),
    buildSensorJSON().c_str()
  );
}

// Publish event (untuk feed aktivitas di web).
void publishEvent(
  uint8_t relay,
  bool state,
  const char* source,
  uint8_t ruleIndex,
  const char* reason
) {

  if (!mqtt.connected()) {
    return;
  }

  JsonDocument doc;
  doc["relay"] = relay + 1;
  doc["state"] = state;
  doc["source"] = source;

  if (source != nullptr && strcmp(source, "auto") == 0) {
    doc["ruleIndex"] = ruleIndex;
    doc["ruleName"] = automationGetRule(ruleIndex).name;
  }

  if (reason != nullptr && reason[0] != '\0') {
    doc["reason"] = reason;
  }

  String out;
  serializeJson(doc, out);

  mqtt.publish(
    TOPIC_EVENT.c_str(),
    out.c_str()
  );
}

// =====================================================
// CONFIG: ACK / RESP
// =====================================================

void publishConfigAck(bool ok, const char* error) {

  if (!mqtt.connected()) {
    return;
  }

  if (ok) {

    // Sertakan full config supaya web langsung sinkron.
    mqtt.publish(
      TOPIC_CONFIG_RESP.c_str(),
      buildConfigJSON().c_str()
    );

    return;
  }

  JsonDocument doc;
  doc["ok"] = false;
  doc["error"] = (error != nullptr) ? error : "unknown";

  String out;
  serializeJson(doc, out);

  mqtt.publish(
    TOPIC_CONFIG_RESP.c_str(),
    out.c_str()
  );
}

// =====================================================
// HANDLER CONFIG (JSON array aturan)
// =====================================================

void handleConfigSet(const char* payload, size_t length) {

  if (length == 0 || length > 6000) {
    Serial.println("[MQTT] config/set terlalu besar / kosong");
    return;
  }

  JsonDocument doc;

  // Deserialisasi langsung dari buffer MQTT (tanpa copy String tambahan)
  // — hemat ~6KB heap pada jalur paling memakan memori.
  DeserializationError err = deserializeJson(doc, payload, length);

  if (err) {

    Serial.print("[MQTT] JSON config invalid: ");
    Serial.println(err.c_str());

    publishConfigAck(false, "invalid_json");
    return;
  }

  if (!doc["rules"].is<JsonArray>()) {

    publishConfigAck(false, "no_rules");
    return;
  }

  JsonArray arr = doc["rules"].as<JsonArray>();

  uint8_t count = 0;

  for (JsonVariant v : arr) {

    if (count >= MAX_RULES) {
      break;
    }

    JsonObject r = v.as<JsonObject>();

    AutomationRule& rule = cfgRules[count];
    memset(&rule, 0, sizeof(rule));

    rule.id = r["id"] | count;

    // Tolak ID duplikat di dalam satu set aturan.
    for (uint8_t k = 0; k < count; k++) {

      if (cfgRules[k].id == rule.id) {

        publishConfigAck(false, "duplicate_rule_id");
        return;
      }
    }

    rule.enabled = r["enabled"] | true;

    int pr = r["priority"] | 0;

    if (pr < 0 || pr > 255) {

      publishConfigAck(false, "invalid_priority");
      return;
    }

    rule.priority = (uint8_t)pr;
    rule.cooldownSec = r["cooldownSec"] | 0;

    const char* name = r["name"] | "";
    strncpy(rule.name, name, MAX_RULE_NAME_LEN);
    rule.name[MAX_RULE_NAME_LEN] = '\0';

    // relay mask (array 1..4)
    JsonArray rels = r["relays"].as<JsonArray>();
    uint8_t mask = 0;

    for (JsonVariant rv : rels) {

      int rn = rv.as<int>();

      if (rn >= 1 && rn <= RELAY_COUNT) {
        mask |= (uint8_t)(1 << (rn - 1));
      }
    }

    if (mask == 0) {

      publishConfigAck(false, "no_relay_selected");
      return;
    }

    rule.relays = mask;

    // type
    const char* type = r["type"] | "";

    if (strcmp(type, "temp") == 0) {
      rule.type = RULE_TEMP;
    } else if (strcmp(type, "timer") == 0) {
      rule.type = RULE_TIMER;
    } else if (strcmp(type, "sched_temp") == 0) {
      rule.type = RULE_SCHED_TEMP;
    } else if (strcmp(type, "hum") == 0) {
      rule.type = RULE_HUM;
    } else {
      rule.type = RULE_TIME;
    }

    // days (untuk time / sched_temp)
    JsonArray days = r["days"].as<JsonArray>();
    uint8_t dayMask = 0;

    for (JsonVariant dv : days) {

      int dd = dv.as<int>();

      if (dd >= 0 && dd <= 6) {
        dayMask |= (uint8_t)(1 << dd);
      }
    }

    rule.days = dayMask;

    // Rentang jadwal: clamp ke 0..1439. startMin==endMin = nonaktif.
    long startMin = r["startMin"] | 0;
    long endMin = r["endMin"] | 0;

    if (startMin < 0 || startMin > 1439 || endMin < 0 || endMin > 1439) {

      publishConfigAck(false, "invalid_time_range");
      return;
    }

    rule.startMin = (uint16_t)startMin;
    rule.endMin = (uint16_t)endMin;

    // Ambang sensor: pastikan tidak meluap dari int16 dan hysteresis
    // valid (on > off). Tanpa ini, ambang terbalik/sama membuat relay
    // tidak pernah menyala secara diam-diam.
    if (rule.type == RULE_TEMP || rule.type == RULE_HUM || rule.type == RULE_SCHED_TEMP) {

      long onV = r["onValue"] | 0;
      long offV = r["offValue"] | 0;

      if (onV < -32768 || onV > 32767 || offV < -32768 || offV > 32767 || onV <= offV) {

        publishConfigAck(false, "invalid_threshold");
        return;
      }

      rule.onValue = (int16_t)onV;
      rule.offValue = (int16_t)offV;
    }

    // Aturan jadwal wajib punya minimal satu hari aktif.
    if ((rule.type == RULE_TIME || rule.type == RULE_SCHED_TEMP) && dayMask == 0) {

      publishConfigAck(false, "no_days");
      return;
    }

    // Timer: durasi ON/OFF (detik). Fase mulai saat aturan disimpan.
    rule.onSec = r["onSec"] | 0;
    rule.offSec = r["offSec"] | 0;
    rule.startEpoch = timeIsSynced() ? getEpochSec() : 0;

    // Validasi timer: kedua fase minimal 1 detik.
    if (rule.type == RULE_TIMER && (rule.onSec == 0 || rule.offSec == 0)) {

      Serial.println("[MQTT] Aturan timer tidak valid (durasi 0)");
      publishConfigAck(false, "invalid_timer");
      return;
    }

    count++;
  }

  Serial.print("[MQTT] Terima ");
  Serial.print(count);
  Serial.println(" aturan (config/set)");

  if (automationSetRules(cfgRules, count)) {

    publishConfigAck(true, nullptr);

  } else {

    publishConfigAck(false, "save_failed");
  }
}

// =====================================================
// HANDLER COMMAND (kontrol manual + management)
// =====================================================

void handleCommand(String msg) {

  msg.trim();

  // Batasi ukuran payload (anti-DoS). Perintah sederhana.
  if (
    msg.length() == 0 ||
    msg.length() > 256
  ) {

    Serial.println(
      "[MQTT] Perintah diabaikan (ukuran)"
    );

    return;
  }

  // Tolak payload ambigu (mengandung on DAN off sekaligus).
  bool hasOn =
    (msg.indexOf("\"on\"") >= 0);
  bool hasOff =
    (msg.indexOf("\"off\"") >= 0);

  if (hasOn && hasOff) {

    Serial.println(
      "[MQTT] Perintah diabaikan (ambigu)"
    );

    return;
  }

  // Parse JSON secara ketat — bukan scan substring. Nama relay
  // berisi kata "all"/"mode"/"reboot" tidak lagi salah diartikan.
  JsonDocument doc;

  DeserializationError err =
    deserializeJson(doc, msg);

  if (err) {

    Serial.print("[MQTT] JSON command invalid: ");
    Serial.println(err.c_str());

    return;
  }

  // REBOOT
  if (doc["reboot"].as<bool>()) {

    publishStatus();

    delay(200);

    Serial.println("[MQTT] Reboot diminta");

    ESP.restart();
    return;
  }

  // ALL ON / ALL OFF
  const char* all = doc["all"] | "";

  if (all[0] != '\0') {

    if (
      strcmp(all, "on") != 0 &&
      strcmp(all, "off") != 0
    ) {
      return;
    }

    bool state = (strcmp(all, "on") == 0);

    // Kontrol manual -> ambil alih mode MANUAL
    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
      automationSetRelayMode(i, false);
    }

    setAllRelays(state);

    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
      publishEvent(i, state, "manual", 0, nullptr);
    }

    return;
  }

  // Relay-specific: mode / nama / state
  int relay = doc["relay"].as<int>();

  if (relay < 1 || relay > RELAY_COUNT) {

    Serial.println("[MQTT] Perintah relay tidak valid");

    return;
  }

  const char* mode = doc["mode"] | "";

  if (mode[0] != '\0') {

    if (
      strcmp(mode, "auto") != 0 &&
      strcmp(mode, "manual") != 0
    ) {
      return;
    }

    automationSetRelayMode(
      relay - 1,
      strcmp(mode, "auto") == 0
    );

    publishStatus();
    return;
  }

  const char* name = doc["name"] | "";

  if (name[0] != '\0') {

    automationSetRelayName(relay - 1, name);

    publishStatus();
    return;
  }

  const char* state = doc["state"] | "";

  if (state[0] != '\0') {

    if (
      strcmp(state, "on") != 0 &&
      strcmp(state, "off") != 0
    ) {
      return;
    }

    bool on = (strcmp(state, "on") == 0);

    // Ambil alih mode MANUAL saat dikontrol manual
    automationSetRelayMode(relay - 1, false);

    setRelay(relay - 1, on);

    publishEvent(relay - 1, on, "manual", 0, nullptr);
    return;
  }
}

// =====================================================
// CALLBACK MQTT
// =====================================================

void mqttCallback(
  char* topic,
  byte* payload,
  unsigned int length
) {

  String t = String(topic);

  if (t == TOPIC_COMMAND) {

    // Perintah kecil (max 256B); copy ke String aman.
    String msg;

    for (
      unsigned int i = 0;
      i < length;
      i++
    ) {
      msg += (char)payload[i];
    }

    handleCommand(msg);

  } else if (t == TOPIC_CONFIG_SET) {

    // config/set bisa ~6KB: parse langsung dari buffer MQTT
    // tanpa menyalin ke String tambahan (hemat heap).
    handleConfigSet((const char*)payload, length);

  } else if (t == TOPIC_CONFIG_GET) {

    mqtt.publish(
      TOPIC_CONFIG_RESP.c_str(),
      buildConfigJSON().c_str()
    );
  }
}

// =====================================================
// CALLBACK AUTOMATION (event otomatis)
// =====================================================

void onAutomationEvent(
  uint8_t relay,
  bool state,
  uint8_t ruleIndex,
  const char* reason
) {

  publishEvent(relay, state, "auto", ruleIndex, reason);
}

// =====================================================
// CONNECT / INIT / LOOP
// =====================================================

void connectMQTT() {

  if (mqtt.connected()) {
    return;
  }

  Serial.print(
    "Connecting MQTT..."
  );

  const String clientId =
    String(DEVICE_ID) + "_" +
    String(ESP.getChipId());

  bool ok;

  if (
    strlen(MQTT_USER) > 0
  ) {

    ok = mqtt.connect(
      clientId.c_str(),
      MQTT_USER,
      MQTT_PASS
    );

  } else {

    ok = mqtt.connect(
      clientId.c_str()
    );
  }

  if (ok) {

    Serial.println(
      " connected!"
    );

    mqtt.subscribe(TOPIC_COMMAND.c_str(), 1);
    mqtt.subscribe(TOPIC_CONFIG_SET.c_str(), 1);
    mqtt.subscribe(TOPIC_CONFIG_GET.c_str(), 1);

    // Kirim status saat pertama konek
    lastRelayBits = readRelayBits();
    lastMqttPublish = 0;
    publishStatus();

  } else {

    Serial.print(
      " gagal (rc="
    );
    Serial.print(mqtt.state());
    Serial.println(
      "), retry lagi nanti"
    );
  }
}

void initMQTT() {

  // TLS terenkripsi tanpa verifikasi sertifikat (tidak butuh
  // sinkronisasi waktu/NTP). Enkripsi aktif, tapi identitas
  // server tidak diverifikasi -> cukup untuk proyek hobi.
  mqttWifiClient.setInsecure();

  mqtt.setServer(
    MQTT_HOST,
    MQTT_PORT
  );

  // Buffer lebih besar untuk payload config JSON (max ~6KB).
  if (!mqtt.setBufferSize(6144)) {
    Serial.println("[MQTT] Gagal alokasi buffer 6KB — config/set besar bisa terpotong");
  }

  mqtt.setCallback(
    mqttCallback
  );

  // Terima notifikasi dari mesin automation untuk event feed.
  automationSetEventCb(onAutomationEvent);

  connectMQTT();
}

void mqttLoop() {

  if (!wifiIsReady()) {
    return;
  }

  // Reconnect TIDAK blocking: coba tiap MQTT_RECONNECT_MS.
  if (!mqtt.connected()) {

    if (
      millis() - lastMqttReconnect >=
      MQTT_RECONNECT_MS
    ) {

      lastMqttReconnect = millis();

      connectMQTT();
    }

    return;
  }

  mqtt.loop();

  // Publish jika state relay berubah
  uint8_t bits = readRelayBits();

  if (bits != lastRelayBits) {

    lastRelayBits = bits;

    publishStatus();

    return;
  }

  // Publish berkala (status + sensor)
  if (
    millis() - lastMqttPublish >=
    MQTT_PUBLISH_INTERVAL_MS
  ) {

    lastMqttPublish = millis();

    publishStatus();
  }
}