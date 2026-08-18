#include <Arduino.h>
#include <ESP8266WiFi.h>

#include "config.h"
#include "relay.h"
#include "sensor.h"
#include "webserver.h"
#include "mqttclient.h"

// =====================================================
// MAIN: WIRING
// =====================================================

// Relay IN1 -> D1 / GPIO5
// Relay IN2 -> D2 / GPIO4
// Relay IN3 -> D5 / GPIO14
// Relay IN4 -> D6 / GPIO12
// Relay GND -> GND
// DHT11 DATA -> D7 / GPIO13
// DHT11 VCC  -> 3.3V
// DHT11 GND  -> GND

void setup() {

  Serial.begin(9600);

  delay(100);

  Serial.println();
  Serial.println();
  Serial.println(
    "================================"
  );
  Serial.println(
    " ESP8266 RELAY CONTROLLER"
  );
  Serial.println(
    "================================"
  );

  // Inisialisasi relay (semua OFF saat boot)
  initRelays();

  // Inisialisasi sensor DHT11
  initSensor();

  // -----------------------------------------------
  // WiFi
  // -----------------------------------------------

  if (ENABLE_MODEM_SLEEP) {
    WiFi.setSleepMode(
      WIFI_MODEM_SLEEP
    );
  }

  WiFi.mode(
    WIFI_STA
  );

  if (!WiFi.config(
        STATIC_IP,
        GATEWAY,
        SUBNET,
        DNS
      )) {

    Serial.println(
      "Gagal konfigurasi IP statis"
    );
  }

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  Serial.print(
    "Connecting to WiFi"
  );

  // Timeout supaya tidak hang selamanya saat WiFi mati
  uint32_t wifiStart =
    millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - wifiStart <
      WIFI_CONNECT_TIMEOUT_MS
  ) {

    delay(500);

    Serial.print(".");
  }

  Serial.println();

  if (
    WiFi.status() == WL_CONNECTED
  ) {

    Serial.println(
      "WiFi connected!"
    );

    Serial.print(
      "IP Address: "
    );

    Serial.println(
      WiFi.localIP()
    );

  } else {

    Serial.println(
      "[WARN] WiFi tidak terhubung. "
      "Akan retry otomatis via MQTT loop."
    );
  }

  // -----------------------------------------------
  // Web server
  // -----------------------------------------------

  initWebServer();

  // MQTT untuk kontrol jarak jauh
  initMQTT();

  Serial.println(
    "HTTP server started"
  );

  Serial.println(
    "================================"
  );
}

void loop() {

  handleWebClient();

  updateSensor();

  mqttLoop();
}