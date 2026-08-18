#include "mqttclient.h"
#include "config.h"
#include "relay.h"
#include "sensor.h"
#include "status.h"
#include "automation.h"
#include "timeSync.h"
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

void handleConfigSet(String msg) {

  if (msg.length() == 0 || msg.length() > 6000) {
    Serial.println("[MQTT] config/set terlalu besar / kosong");
    return;
  }

  JsonDocument doc;

  DeserializationError err = deserializeJson(doc, msg);

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

  AutomationRule rules[MAX_RULES];
  uint8_t count = 0;

  for (JsonVariant v : arr) {

    if (count >= MAX_RULES) {
      break;
    }

    JsonObject r = v.as<JsonObject>();

    AutomationRule& rule = rules[count];
    memset(&rule, 0, sizeof(rule));

    rule.id = r["id"] | count;
    rule.enabled = r["enabled"] | true;
    rule.priority = r["priority"] | 0;
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
    } else if (strcmp(type, "hum") == 0) {
      rule.type = RULE_HUM;
    } else if (strcmp(type, "sched_temp") == 0) {
      rule.type = RULE_SCHED_TEMP;
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

    rule.startMin = r["startMin"] | 0;
    rule.endMin = r["endMin"] | 0;
    rule.onValue = r["onValue"] | 0;
    rule.offValue = r["offValue"] | 0;

    count++;
  }

  Serial.print("[MQTT] Terima ");
  Serial.print(count);
  Serial.println(" aturan (config/set)");

  if (automationSetRules(rules, count)) {

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
    msg.length() > 128
  ) {

    Serial.println(
      "[MQTT] Perintah diabaikan (ukuran)"
    );

    return;
  }

  // Tolak payload ambigu (mengandung on DAN off)
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

  // REBOOT
  if (msg.indexOf("\"reboot\"") >= 0) {

    publishStatus();

    delay(200);

    Serial.println("[MQTT] Reboot diminta");

    ESP.restart();
    return;
  }

  // RELAY MODE: {"relay":N,"mode":"auto"|"manual"}
  if (msg.indexOf("\"mode\"") >= 0) {

    int idx = msg.indexOf("\"relay\"");

    if (idx >= 0) {

      int relay = 0;
      int pos = msg.indexOf(':', idx) + 1;

      while (pos < (int)msg.length() && isDigit(msg.charAt(pos))) {
        relay = relay * 10 + (msg.charAt(pos) - '0');
        pos++;
      }

      bool autoMode = msg.indexOf("\"auto\"") >= 0;

      if (relay >= 1 && relay <= RELAY_COUNT) {

        automationSetRelayMode(relay - 1, autoMode);
        publishStatus();
      }
    }

    return;
  }

  // RELAY NAME: {"relay":N,"name":"..."}
  if (msg.indexOf("\"name\"") >= 0) {

    int idx = msg.indexOf("\"relay\"");

    if (idx >= 0) {

      int relay = 0;
      int pos = msg.indexOf(':', idx) + 1;

      while (pos < (int)msg.length() && isDigit(msg.charAt(pos))) {
        relay = relay * 10 + (msg.charAt(pos) - '0');
        pos++;
      }

      int nameStart = msg.indexOf(':', msg.indexOf("\"name\"")) + 1;

      int q1 = msg.indexOf('"', nameStart);

      int q2 = (q1 >= 0) ? msg.indexOf('"', q1 + 1) : -1;

      if (relay >= 1 && relay <= RELAY_COUNT && q1 >= 0 && q2 > q1) {

        String name = msg.substring(q1 + 1, q2);

        if (name.length() > 0) {

          automationSetRelayName(relay - 1, name.c_str());
          publishStatus();
        }
      }
    }

    return;
  }

  // ALL ON / ALL OFF
  if (msg.indexOf("\"all\"") >= 0) {

    // Kontrol manual -> ambil alih mode MANUAL
    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
      automationSetRelayMode(i, false);
    }

    setAllRelays(hasOn);

    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
      publishEvent(i, hasOn, "manual", 0, nullptr);
    }

    return;
  }

  // SINGLE RELAY: {"relay":N,"state":"on|off"}
  int idx =
    msg.indexOf("\"relay\"");

  if (idx >= 0) {

    int colon =
      msg.indexOf(
        ':',
        idx
      );

    if (colon > 0) {

      int value = 0;
      int pos = colon + 1;
      bool digitSeen = false;

      while (
        pos < (int)msg.length() &&
        isDigit(msg.charAt(pos))
      ) {

        value =
          value * 10 +
          (msg.charAt(pos) - '0');

        pos++;

        digitSeen = true;

        if (value > RELAY_COUNT) {
          break;
        }
      }

      if (
        digitSeen &&
        value >= 1 &&
        value <= RELAY_COUNT
      ) {

        // Ambil alih mode MANUAL saat dikontrol manual
        automationSetRelayMode(value - 1, false);

        setRelay(
          value - 1,
          hasOn
        );

        publishEvent(value - 1, hasOn, "manual", 0, nullptr);
      } else {

        Serial.println(
          "[MQTT] Perintah relay tidak valid"
        );
      }
    }
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

  String msg;

  for (
    unsigned int i = 0;
    i < length;
    i++
  ) {
    msg += (char)payload[i];
  }

  String t = String(topic);

  if (t == TOPIC_COMMAND) {

    handleCommand(msg);

  } else if (t == TOPIC_CONFIG_SET) {

    handleConfigSet(msg);

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

    mqtt.subscribe(TOPIC_COMMAND.c_str());
    mqtt.subscribe(TOPIC_CONFIG_SET.c_str());
    mqtt.subscribe(TOPIC_CONFIG_GET.c_str());

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
  mqtt.setBufferSize(6144);

  mqtt.setCallback(
    mqttCallback
  );

  // Terima notifikasi dari mesin automation untuk event feed.
  automationSetEventCb(onAutomationEvent);

  connectMQTT();
}

void mqttLoop() {

  if (
    WiFi.status() != WL_CONNECTED
  ) {
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