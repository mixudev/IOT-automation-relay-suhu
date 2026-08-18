#ifndef AUTOMATION_H
#define AUTOMATION_H

#include <Arduino.h>
#include "config.h"

// =====================================================
// JENIS ATURAN
// =====================================================

enum RuleType : uint8_t {
  RULE_TIME       = 0, // jadwal: rentang jam + hari
  RULE_TEMP       = 1, // suhu: hysteresis
  RULE_HUM        = 2, // kelembapan: hysteresis
  RULE_SCHED_TEMP = 3  // kombinasi: jadwal DAN suhu
};

// =====================================================
// STRUKTUR ATURAN (compact, disimpan binary di LittleFS)
// =====================================================
// - relays: bitmask 4 bit (bit0 = relay 1).
// - days: bitmask 7 hari (bit0 = Senin ... bit6 = Minggu),
//   dipakai untuk RULE_TIME dan RULE_SCHED_TEMP.
// - startMin/endMin: menit sejak 00:00. endMin boleh lebih
//   kecil dari startMin (rentang melewati tengah malam).
// - onValue/offValue: nilai sensor (x10, mis. 320 = 32.0C).
//   Hysteresis: nyala saat >= onValue, mati saat <= offValue.
// - priority: 0..10. Bila 2 aturan menyasar relay sama, yang
//   priority-nya lebih tinggi menang; tie -> id terakhir.
// - cooldownSec: jeda minimum antar-switch (0 = pakai default).

struct AutomationRule {
  char     name[MAX_RULE_NAME_LEN + 1];
  uint16_t startMin;
  uint16_t endMin;
  uint16_t cooldownSec;
  uint8_t  id;
  bool     enabled;
  uint8_t  relays;
  uint8_t  type;
  uint8_t  days;
  int8_t   onValue;
  int8_t   offValue;
  uint8_t  priority;
};

// =====================================================
// PUBLIC API
// =====================================================

// Mount LittleFS + load config; gunakan default bila korup.
void automationInit();
// Evaluasi aturan; panggil di loop() (intern rate-limited).
void automationEval();

// Ganti seluruh aturan (dari web via MQTT). Return true bila valid & tersimpan.
bool automationSetRules(const AutomationRule* rules, uint8_t count);
uint8_t automationGetRuleCount();
const AutomationRule& automationGetRule(uint8_t index);
// Reset semua aturan (tulis ulang config).
void automationReset();

// Aktif / nonaktif aturan berdasarkan id. Return false bila id tak ditemukan.
bool automationSetRuleEnabled(uint8_t id, bool enabled);

// Nama relay (dapat diubah dari web).
void automationSetRelayName(uint8_t index, const char* name);
const char* automationGetRelayName(uint8_t index);

// Mode relay: true = AUTO (dikontrol automation), false = MANUAL (jeda).
void automationSetRelayMode(uint8_t index, bool autoMode);
bool automationGetRelayMode(uint8_t index);

// Callback ketika automation mengubah relay (untuk publish event MQTT).
typedef void (*AutomationEventCb)(
  uint8_t relay,
  bool state,
  uint8_t ruleIndex,
  const char* reason
);
void automationSetEventCb(AutomationEventCb cb);

#endif