#include "mqttclient.h"
#include "config.h"
#include "relay.h"
#include "sensor.h"
#include "status.h"
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// =====================================================
// TOPIK
// =====================================================

const String TOPIC_COMMAND =
  String(DEVICE_ID) + "/command";
const String TOPIC_STATUS =
  String(DEVICE_ID) + "/status";
const String TOPIC_SENSOR =
  String(DEVICE_ID) + "/sensor";

// =====================================================
// CLIENT
// =====================================================

WiFiClientSecure mqttWifiClient;
PubSubClient mqtt(mqttWifiClient);

uint32_t lastMqttPublish = 0;
uint32_t lastMqttReconnect = 0;

// Interval percobaan reconnect (ms)
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

// =====================================================
// PARSER PERINTAH (JSON sederhana)
// =====================================================
//
// Contoh perintah yang diterima:
//   {"all":"on"}            -> semua relay ON
//   {"all":"off"}           -> semua relay OFF
//   {"relay":2,"state":"on"}-> relay 2 ON
//   {"relay":4,"state":"off"}-> relay 4 OFF

// Parser di-hardening: tolak payload kosong/ambigu/terlalu besar.

void handleCommand(String msg) {

  msg.trim();

  // Batasi ukuran payload (anti-DoS)
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

  // ALL ON / ALL OFF
  if (msg.indexOf("\"all\"") >= 0) {

    setAllRelays(hasOn);

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

      // Ambil digit pertama setelah ':'
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

        setRelay(
          value - 1,
          hasOn
        );
      } else {

        Serial.println(
          "[MQTT] Perintah relay tidak valid"
        );
      }
    }
  }
}

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

  if (
    String(topic) == TOPIC_COMMAND
  ) {

    handleCommand(msg);
  }
}

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

    mqtt.subscribe(
      TOPIC_COMMAND.c_str()
    );

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

  mqtt.setCallback(
    mqttCallback
  );

  connectMQTT();
}

void mqttLoop() {

  if (
    WiFi.status() != WL_CONNECTED
  ) {
    return;
  }

  // Reconnect TIDAK blocking: coba tiap MQTT_RECONNECT_MS.
  // Selama broker down, loop dan server web tetap berjalan.
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