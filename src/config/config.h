#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <IPAddress.h>

// =====================================================
// SECRETS (dari .env via scripts/gen_secrets.ps1)
// =====================================================

#include "secrets.h"

#ifndef SECRET_WIFI_SSID
#define SECRET_WIFI_SSID ""
#endif

#ifndef SECRET_WIFI_PASS
#define SECRET_WIFI_PASS ""
#endif

#ifndef SECRET_MQTT_HOST
#define SECRET_MQTT_HOST ""
#endif

#ifndef SECRET_MQTT_PORT
#define SECRET_MQTT_PORT 8883
#endif

#ifndef SECRET_MQTT_USER
#define SECRET_MQTT_USER ""
#endif

#ifndef SECRET_MQTT_PASS
#define SECRET_MQTT_PASS ""
#endif

#ifndef SECRET_DEVICE_ID
#define SECRET_DEVICE_ID "iot_default"
#endif

// =====================================================
// WIFI CONFIGURATION
// =====================================================

const char* const WIFI_SSID =
  SECRET_WIFI_SSID;
const char* const WIFI_PASSWORD =
  SECRET_WIFI_PASS;

// IP statis ESP8266 (sesuaikan dengan jaringan Anda)
const IPAddress STATIC_IP(192, 168, 1, 177);
const IPAddress GATEWAY(192, 168, 1, 1);
const IPAddress SUBNET(255, 255, 255, 0);
const IPAddress DNS(192, 168, 1, 1);

// =====================================================
// RELAY CONFIGURATION
// =====================================================

// D1 = GPIO5
// D2 = GPIO4
// D5 = GPIO14
// D6 = GPIO12

const uint8_t RELAY_COUNT = 4;

const uint8_t RELAY_PINS[RELAY_COUNT] = { 5, 4, 14, 12 };

// Banyak modul relay bersifat ACTIVE LOW.
// HIGH = OFF
// LOW  = ON
const bool RELAY_ACTIVE_LOW = true;

// =====================================================
// DHT SENSOR CONFIGURATION
// =====================================================

// D4 = GPIO2
// D7 = GPIO13 (pin bersih, tidak tersambung LED onboard)
const uint8_t DHT_PIN = 13;

// Interval baca sensor (ms). DHT11 maksimal 1 Hz.
const uint32_t DHT_INTERVAL_MS = 2000;

// =====================================================
// MQTT CONFIGURATION (KONTROL JARAK JAUH)
// =====================================================
//
// Alur: ESP8266 + Web (Vercel) sama-sama terhubung ke
// broker MQTT. Perintah dikirim lewat topik /command,
// status & sensor dipublish ESP ke /status dan /sensor.
//
// Broker publik gratis (EMQX) default. Untuk produksi
// sebaiknya pakai broker sendiri (mis. HiveMQ Cloud).

const char* const MQTT_HOST =
  SECRET_MQTT_HOST;              // TLS MQTT (HiveMQ Cloud)
const uint16_t MQTT_PORT =
  SECRET_MQTT_PORT;
const char* const MQTT_USER =
  SECRET_MQTT_USER;
const char* const MQTT_PASS =
  SECRET_MQTT_PASS;

// DEVICE_ID = identitas perangkat. SAMA dengan deviceId
// di web (dari env DEVICE_ID yang sama). Jangan pakai
// default "iot_default" untuk produksi.
const char* const DEVICE_ID =
  SECRET_DEVICE_ID;

// Interval publish status/sensor (ms)
const uint32_t MQTT_PUBLISH_INTERVAL_MS = 5000;

// =====================================================
// WEB SERVER (LAN) SECURITY
// =====================================================

// Kunci akses untuk endpoint KONTROL web lokal
// (/relay/..., /all/...). Siapa pun di WiFi Anda yang memuat
// halaman ESP akan menerima kunci ini di HTML — jadi ini hanya
// proteksi dari manipulasi acak, bukan keamanan tingkat tinggi.
// Kosongkan ("") untuk menonaktifkan pemeriksaan.
const char* const WEB_ACCESS_KEY = "K5m8Tq2Zr9xV";

// =====================================================
// POWER SAVING
// =====================================================

// true = modem sleep: hemat daya saat WiFi idle.
// false = selalu aktif (latensi MQTT sedikit lebih rendah).
const bool ENABLE_MODEM_SLEEP = true;

// =====================================================
// KONEKSI
// =====================================================

// Timeout koneksi WiFi (ms) sebelum ESP melanjutkan boot.
const uint32_t WIFI_CONNECT_TIMEOUT_MS = 20000;

// =====================================================
// AUTOMATION (MESIN ATURAN)
// =====================================================

// Nama default relay ( bisa diganti dari web / command ).
// Disimpan di LittleFS dan dikirim ke web lewat status/config.
const char* const RELAY_DEFAULT_NAMES[RELAY_COUNT] = {
  "Relay 1", "Relay 2", "Relay 3", "Relay 4"
};

// Batas jumlah aturan. Menyesuaikan RAM (32 x ~32B = 1KB).
// Satu relay boleh di-assign ke banyak aturan.
#define MAX_RULES 32
#define MAX_RULE_NAME_LEN 16

// File binary konfigurasi automation di LittleFS.
#define AUTOMATION_FILE "/auto.bin"

// Interval evaluasi aturan (ms). DHT dibaca max 1Hz, jadi
// 1 detik sudah cukup untuk mengontrol relay.
const uint32_t AUTO_EVAL_INTERVAL_MS = 1000;

// Jeda default antar-switch per relay (detik) bila aturan
// tidak men-set cooldown sendiri. Melindungi relay dari churn.
const uint16_t AUTO_DEFAULT_COOLDOWN_SEC = 60;

// =====================================================
// WAKTU (NTP)
// =====================================================

const char* const NTP_SERVER = "pool.ntp.org";

// Offset zona waktu dalam detik (Asia/Jakarta = UTC+7, tanpa DST).
const long NTP_TZ_OFFSET_SEC = 7L * 3600L;

#endif
