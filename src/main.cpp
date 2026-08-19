#include <Arduino.h>

#include "config/config.h"
#include "hardware/relay/relay.h"
#include "hardware/sensor/sensor.h"
#include "services/wifi/wifi.h"
#include "services/time/timeSync.h"
#include "services/automation/automation.h"
#include "transport/http/webserver.h"
#include "transport/mqtt/mqttclient.h"

// =====================================================
// MAIN: WIRING
// =====================================================

// Relay IN1 -> D1 / GPIO5
// Relay IN2 -> D2 / GPIO4
// Relay IN3 -> D5 / GPIO14
// Relay IN4 -> D6 / GPIO12
// Relay GND -> GND
// DHT22 DATA -> D7 / GPIO13
// DHT22 VCC  -> 3.3V
// DHT22 GND  -> GND

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

  // Inisialisasi sensor DHT22
  initSensor();

  // WiFi (STA + IP statis, blocking sampai timeout)
  initWifi();

  // Web server lokal
  initWebServer();

  // MQTT untuk kontrol jarak jauh
  initMQTT();

  // Mesin automation (aturan jadwal / suhu / timer)
  automationInit();

  // Sinkronisasi waktu NTP (untuk aturan berbasis jadwal)
  initTimeSync();

  Serial.println(
    "HTTP server started"
  );

  Serial.println(
    "================================"
  );
}

void loop() {

  handleWebClient();

  wifiLoop();

  updateSensor();

  timeSyncLoop();

  automationEval();

  mqttLoop();
}