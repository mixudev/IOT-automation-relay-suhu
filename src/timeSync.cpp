#include "timeSync.h"
#include "config.h"
#include <ESP8266WiFi.h>
#include <time.h>

// =====================================================
// WAKTU (NTP)
// =====================================================
//
// ESP8266 tidak punya RTC dengan baterai. Untuk menjalankan
// aturan berbasis jadwal, waktu disinkronkan dari NTP.
//
// - Tanpa NTP, aturan TEMP/HUM tetap berjalan (tidak butuh waktu).
// - Aturan TIME / SCHED_TEMP baru aktif setelah timeIsSynced().
//
// configTime() + SNTP berjalan non-blocking di background
// (sinchronization dilakukan oleh core). Kita hanya cek flag.

uint32_t lastSyncCheck = 0;
bool synced = false;

void initTimeSync() {

  // configTime(tzOffsetSec, daylightOffsetSec, server1, server2, server3)
  // ESP8266 core 3.x: param pertama adalah offset detik atau string TZ.
  configTime(NTP_TZ_OFFSET_SEC, 0, NTP_SERVER);

  Serial.println("[TIME] Sinkronisasi NTP dimulai (non-blocking)");
}

void timeSyncLoop() {

  // Jangan periksa terlalu sering (hemat CPU/RAM).
  if (millis() - lastSyncCheck < 30000) {
    return;
  }

  lastSyncCheck = millis();

  if (synced) {
    return;
  }

  // Ambil timestamp. Jika masih mendekati epoch 1970 berarti
  // belum sinkron (nilai < 2020 jam Unix).
  time_t now = time(nullptr);

  if (now > 1600000000L) { // > Tahun 2020
    synced = true;

    struct tm* ti = localtime(&now);
    char buf[32];
    snprintf(buf, sizeof(buf),
      "%04d-%02d-%02d %02d:%02d:%02d",
      ti->tm_year + 1900, ti->tm_mon + 1, ti->tm_mday,
      ti->tm_hour, ti->tm_min, ti->tm_sec);

    Serial.print("[TIME] Sinkron: ");
    Serial.println(buf);
  }
}

bool timeIsSynced() {
  return synced;
}

uint16_t getLocalMinuteOfDay() {

  time_t now = time(nullptr);
  struct tm* ti = localtime(&now);

  return (uint16_t)(ti->tm_hour * 60 + ti->tm_min);
}

uint8_t getLocalDayOfWeek() {

  time_t now = time(nullptr);
  struct tm* ti = localtime(&now);

  // tm_wday: 0=Minggu, 1=Senin, ... 6=Sabtu
  // Konversi ke 0=Senin ... 6=Minggu supaya cocok dengan bitmask.
  return (uint8_t)((ti->tm_wday + 6) % 7);
}

uint32_t getEpochSec() {
  return (uint32_t)time(nullptr);
}