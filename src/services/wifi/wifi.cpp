#include "wifi.h"
#include "config/config.h"
#include <ESP8266WiFi.h>

// =====================================================
// WIFI (STA + IP statis)
// =====================================================
// initWifi() memblok hingga WIFI_CONNECT_TIMEOUT_MS lalu
// menyerahkan kendali ke loop. wifiLoop() mendeteksi koneksi
// yang putus setelah boot dan mencoba reconnect periodik —
// sebelumnya tidak ada jalur reconnect sama sekali.

static bool wifiReady = false;
static uint32_t lastReconnectAttempt = 0;
static uint32_t connectStartMs = 0;   // saat WiFi.begin() terakhir dipanggil
static bool connecting = false;       // sedang menunggu hasil reconnect

static void printConnected() {

  Serial.print("WiFi connected!");
  Serial.print(" (IP: ");
  Serial.print(WiFi.localIP());
  Serial.println(")");
}

void initWifi() {

  if (ENABLE_MODEM_SLEEP) {
    WiFi.setSleepMode(WIFI_MODEM_SLEEP);
  }

  WiFi.mode(WIFI_STA);

  if (!WiFi.config(STATIC_IP, GATEWAY, SUBNET, DNS)) {
    Serial.println("[WIFI] Gagal konfigurasi IP statis");
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("[WIFI] Connecting to WiFi");

  uint32_t start = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - start < WIFI_CONNECT_TIMEOUT_MS
  ) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  wifiReady = (WiFi.status() == WL_CONNECTED);

  if (wifiReady) {
    printConnected();
  } else {
    Serial.println("[WIFI] Gagal konek saat boot. Reconnect via loop.");
  }
}

bool wifiIsReady() {
  return wifiReady;
}

// Reconnect NON-BLOCKING: WiFi.begin() berjalan asinkron di core,
// jadi cukup panggil sekali lalu polling status tiap loop. Tidak
// memblokir web server / sensor / automation selama WiFi putus.
void wifiLoop() {

  if (wifiReady) {

    // Deteksi koneksi putus setelah pernah terhubung.
    if (WiFi.status() != WL_CONNECTED) {

      wifiReady = false;
      connecting = false;
      Serial.println("[WIFI] Koneksi putus — mencoba reconnect");

      lastReconnectAttempt = millis();
    }

    return;
  }

  if (!connecting) {

    // Jeda antar percobaan.
    if (
      millis() - lastReconnectAttempt <
      WIFI_RECONNECT_MS
    ) {
      return;
    }

    connecting = true;
    connectStartMs = millis();

    Serial.print("[WIFI] Mencoba reconnect...");

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    return;
  }

  // Sedang menunggu hasil: polling tanpa delay blocking.
  if (WiFi.status() == WL_CONNECTED) {

    connecting = false;
    wifiReady = true;
    printConnected();

    return;
  }

  if (
    millis() - connectStartMs >=
    WIFI_RECONNECT_TIMEOUT_MS
  ) {

    connecting = false;
    lastReconnectAttempt = millis();
    Serial.println("[WIFI] Reconnect gagal, coba lagi nanti");
  }
}