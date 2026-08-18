#include "automation.h"
#include "relay.h"
#include "sensor.h"
#include "timeSync.h"
#include <LittleFS.h>
#include <stddef.h>

// =====================================================
// PERSISTENSI
// =====================================================
// Satu file binary: magic + version + relayModes +
// relayState + relayNames + jumlah aturan + array aturan.
// Ditulis HANYA saat ada perubahan (anti flash-wear).
// CRC-8 (XOR accumulative) untuk deteksi korup; byte CRC
// TIDAK ikut dihitung agar nilai yang disimpan valid saat
// dimuat ulang.

#define AUTO_FILE_MAGIC 0xA5010002UL
#define AUTO_FILE_VERSION 2

struct PersistHeader {
  uint32_t magic;
  uint16_t version;
  uint8_t  relayModes;              // bit per relay, 1 = AUTO
  uint8_t  relayState;              // bit per relay, 1 = ON (terpulihkan saat boot)
  uint8_t  relayNameLen;            // panjang nama relay (17)
  uint8_t  ruleCount;
  uint8_t  crc;
};

struct PersistFile {
  PersistHeader header;
  char relayNames[RELAY_COUNT][MAX_RULE_NAME_LEN + 1];
  AutomationRule rules[MAX_RULES];
};

// =====================================================
// STATE (RAM)
// =====================================================

static PersistFile cfg;
static uint8_t relayModes = 0xFF;   // default semua AUTO
static bool ruleActive[MAX_RULES];  // state hysteresis per aturan
static uint32_t lastSwitchMs[RELAY_COUNT]; // anti-churn per relay
static uint32_t lastEvalMs = 0;
static uint8_t lastPersistedBits = 0; // state relay terakhir di file
static AutomationEventCb eventCb = nullptr;

// Callback bebas reentrant: dipakai oleh sensor.cpp bila perlu.
static uint8_t relayCount() {
  return RELAY_COUNT;
}

// =====================================================
// CRC-8 (XOR accumulative) sederhana
// =====================================================

static uint8_t computeCrc(const uint8_t* data, size_t len) {

  uint8_t crc = 0xFF;

  for (size_t i = 0; i < len; i++) {
    crc ^= data[i];
    crc = (uint8_t)(crc * 97u + 53u); // tipe xorshift ringan
  }

  return crc;
}

// =====================================================
// PERSISTENSI: SAVE / LOAD
// =====================================================

static void writeDefaults() {

  cfg.header.magic = AUTO_FILE_MAGIC;
  cfg.header.version = AUTO_FILE_VERSION;
  cfg.header.relayModes = 0xFF;      // default semua AUTO
  cfg.header.relayState = 0;         // default semua OFF
  cfg.header.relayNameLen = MAX_RULE_NAME_LEN + 1;
  cfg.header.ruleCount = 0;
  cfg.header.crc = 0;

  for (uint8_t i = 0; i < relayCount(); i++) {
    strncpy(
      cfg.relayNames[i],
      RELAY_DEFAULT_NAMES[i],
      MAX_RULE_NAME_LEN
    );
    cfg.relayNames[i][MAX_RULE_NAME_LEN] = '\0';
  }

  memset(cfg.rules, 0, sizeof(cfg.rules));
}

static void recalcCrc() {

  uint8_t buf[sizeof(PersistFile)];
  memcpy(buf, &cfg, sizeof(cfg));
  // Byte CRC tidak ikut dihitung (dibuat 0 dulu).
  buf[offsetof(PersistHeader, crc)] = 0;
  cfg.header.crc = computeCrc(buf, sizeof(buf));
}

bool automationSave() {

  recalcCrc();

  File f = LittleFS.open(AUTOMATION_FILE, "w");

  if (!f) {
    Serial.println("[AUTO] Gagal membuka file untuk menulis");
    return false;
  }

  size_t written = f.write(
    (const uint8_t*)&cfg,
    sizeof(cfg)
  );
  f.close();

  Serial.print("[AUTO] Tersimpan (");
  Serial.print(written);
  Serial.print(" byte, ");
  Serial.print(cfg.header.ruleCount);
  Serial.println(" aturan)");

  return written == sizeof(cfg);
}

void automationInit() {

  if (!LittleFS.begin()) {
    Serial.println("[AUTO] LittleFS gagal mount");
    return;
  }

  relayModes = 0xFF; // default: semua AUTO

  File f = LittleFS.open(AUTOMATION_FILE, "r");

  if (!f) {
    Serial.println("[AUTO] Tidak ada config, buat default");
    writeDefaults();
    automationSave();
    return;
  }

  size_t read = f.read((uint8_t*)&cfg, sizeof(cfg));
  f.close();

  if (
    read == sizeof(cfg) &&
    cfg.header.magic == AUTO_FILE_MAGIC &&
    cfg.header.version == AUTO_FILE_VERSION
  ) {

    uint8_t buf[sizeof(PersistFile)];
    memcpy(buf, &cfg, sizeof(cfg));
    buf[offsetof(PersistHeader, crc)] = 0;

    if (
      cfg.header.crc ==
      computeCrc(buf, sizeof(buf))
    ) {

      relayModes = cfg.header.relayModes;
      lastPersistedBits = cfg.header.relayState;

      // Pulihkan kondisi relay sesuai pengaturan terakhir.
      for (uint8_t i = 0; i < relayCount(); i++) {
        forceRelayState(i, (cfg.header.relayState >> i) & 1);
      }

      Serial.print("[AUTO] Config dimuat: ");
      Serial.print(cfg.header.ruleCount);
      Serial.println(" aturan");
      return;
    }

    Serial.println("[AUTO] CRC tidak cocok, pakai default");
  } else {

    Serial.println("[AUTO] Config korup, pakai default");
  }

  lastPersistedBits = 0;
  writeDefaults();
  automationSave();
}

// =====================================================
// SETTER RULES / NAMA / MODE
// =====================================================

bool automationSetRules(const AutomationRule* rules, uint8_t count) {

  if (count > MAX_RULES) {
    Serial.println("[AUTO] Terlalu banyak aturan");
    return false;
  }

  if (count > 0 && rules == nullptr) {
    return false;
  }

  cfg.header.ruleCount = count;

  for (uint8_t i = 0; i < count; i++) {
    cfg.rules[i] = rules[i];
    ruleActive[i] = false; // reset hysteresis state
  }

  // Bersihkan sisa slot
  for (uint8_t i = count; i < MAX_RULES; i++) {
    memset(&cfg.rules[i], 0, sizeof(AutomationRule));
    ruleActive[i] = false;
  }

  memset(lastSwitchMs, 0, sizeof(lastSwitchMs));

  Serial.print("[AUTO] Terima ");
  Serial.print(count);
  Serial.println(" aturan");

  return automationSave();
}

uint8_t automationGetRuleCount() {
  return cfg.header.ruleCount;
}

const AutomationRule& automationGetRule(uint8_t index) {
  return cfg.rules[index];
}

void automationReset() {

  writeDefaults();
  automationSave();

  memset(ruleActive, 0, sizeof(ruleActive));
  memset(lastSwitchMs, 0, sizeof(lastSwitchMs));

  lastPersistedBits = 0;

  // Kondisi relay kembali semua OFF (sesuai default).
  for (uint8_t i = 0; i < relayCount(); i++) {
    forceRelayState(i, false);
  }
}

bool automationSetRuleEnabled(uint8_t id, bool enabled) {

  for (uint8_t i = 0; i < cfg.header.ruleCount; i++) {

    if (cfg.rules[i].id == id) {

      cfg.rules[i].enabled = enabled;
      automationSave();

      Serial.print("[AUTO] Aturan ");
      Serial.print(id);
      Serial.println(enabled ? " diaktifkan" : " dinonaktifkan");

      return true;
    }
  }

  return false;
}

void automationSetRelayName(uint8_t index, const char* name) {

  if (index >= relayCount() || name == nullptr) {
    return;
  }

  strncpy(
    cfg.relayNames[index],
    name,
    MAX_RULE_NAME_LEN
  );
  cfg.relayNames[index][MAX_RULE_NAME_LEN] = '\0';

  automationSave();
}

void automationSetRelayMode(uint8_t index, bool autoMode) {

  if (index >= relayCount()) {
    return;
  }

  if (autoMode) {
    relayModes |= (uint8_t)(1 << index);
  } else {
    relayModes &= (uint8_t)~(1 << index);
  }

  cfg.header.relayModes = relayModes;

  automationSave();

  Serial.print("[AUTO] Relay ");
  Serial.print(index + 1);
  Serial.println(autoMode ? " -> AUTO" : " -> MANUAL");
}

bool automationGetRelayMode(uint8_t index) {

  if (index >= relayCount()) {
    return false;
  }

  return (relayModes & (1 << index)) != 0;
}

const char* automationGetRelayName(uint8_t index) {

  if (index >= relayCount()) {
    return "";
  }

  return cfg.relayNames[index];
}

void automationSetEventCb(AutomationEventCb cb) {
  eventCb = cb;
}

// =====================================================
// EVALUATOR
// =====================================================

static bool isRelayInRule(const AutomationRule& r, uint8_t relay) {
  return (r.relays & (1 << relay)) != 0;
}

static bool isDayMatch(const AutomationRule& r) {

  if (r.days == 0) {
    return false; // tidak ada hari dipilih
  }

  uint8_t day = getLocalDayOfWeek();

  return (r.days & (1 << day)) != 0;
}

static bool isInTimeRange(const AutomationRule& r, uint16_t minuteNow) {

  if (r.startMin < r.endMin) {
    return minuteNow >= r.startMin && minuteNow < r.endMin;
  }

  // Rentang melewati tengah malam (mis. 22:00 - 06:00)
  return minuteNow >= r.startMin || minuteNow < r.endMin;
}

// Hasil evaluasi satu aturan saat ini (true = relay harus ON).
static bool evaluateRule(const AutomationRule& r, uint8_t idx) {

  switch (r.type) {

    case RULE_TIME:

      if (!timeIsSynced()) {
        return false;
      }

      if (!isDayMatch(r)) {
        return false;
      }

      return isInTimeRange(r, getLocalMinuteOfDay());

    case RULE_TEMP:
    case RULE_HUM: {

      if (!sensorIsValid()) {
        return ruleActive[idx]; // pertahankan state terakhir
      }

      float value = (r.type == RULE_TEMP)
        ? getTemperature()
        : getHumidity();

      int16_t onV = r.onValue;
      int16_t offV = r.offValue;

      // Hysteresis: nyala saat >= on, mati saat <= off
      if (ruleActive[idx]) {

        if (value <= offV / 10.0f) {
          ruleActive[idx] = false;
        }
      } else {

        if (value >= onV / 10.0f) {
          ruleActive[idx] = true;
        }
      }

      return ruleActive[idx];
    }

    case RULE_SCHED_TEMP:

      if (!timeIsSynced() || !isDayMatch(r)) {
        ruleActive[idx] = false;
        return false;
      }

      if (!isInTimeRange(r, getLocalMinuteOfDay())) {
        ruleActive[idx] = false;
        return false;
      }

      if (!sensorIsValid()) {
        return ruleActive[idx];
      }

      if (getTemperature() <= r.offValue / 10.0f) {
        ruleActive[idx] = false;
      } else if (getTemperature() >= r.onValue / 10.0f) {
        ruleActive[idx] = true;
      }

      return ruleActive[idx];

    default:
      return false;
  }
}

// Bangun alasan singkat untuk event log (bukan dynamic string,
// pakai buffer tetap).
static const char* buildReason(
  const AutomationRule& r,
  char* out,
  size_t len
) {

  if (r.type == RULE_TEMP) {

    snprintf(out, len, "suhu %.1fC", getTemperature());
    return out;
  }

  if (r.type == RULE_HUM) {

    snprintf(out, len, "lembap %.0f%%", getHumidity());
    return out;
  }

  snprintf(out, len, "jadwal");
  return out;
}

void automationEval() {

  if (millis() - lastEvalMs < AUTO_EVAL_INTERVAL_MS) {
    return;
  }

  lastEvalMs = millis();

  // Persist state relay bila berubah — supaya saat restart relay
  // kembali ke kondisi yang sama (bukan nyala semua).
  uint8_t bits = 0;

  for (uint8_t ri = 0; ri < relayCount(); ri++) {
    if (getRelayState(ri)) {
      bits |= (uint8_t)(1 << ri);
    }
  }

  if (bits != lastPersistedBits) {

    lastPersistedBits = bits;
    cfg.header.relayState = bits;
    automationSave();
  }

  // Evaluasi setiap relay yang dalam mode AUTO.
  for (uint8_t relayIdx = 0; relayIdx < relayCount(); relayIdx++) {

    if (!automationGetRelayMode(relayIdx)) {
      continue; // MANUAL -> dijeda dari automation
    }

    // Cari aturan pemenang (priority tertinggi, tie -> id terakhir)
    int8_t bestIdx = -1;
    uint8_t bestPriority = 0;
    uint8_t bestId = 0;

    for (uint8_t i = 0; i < cfg.header.ruleCount; i++) {

      const AutomationRule& r = cfg.rules[i];

      if (!r.enabled || !isRelayInRule(r, relayIdx)) {
        continue;
      }

      bool desired = evaluateRule(r, i);

      if (
        bestIdx < 0 ||
        r.priority > bestPriority ||
        (r.priority == bestPriority && r.id >= bestId)
      ) {

        bestIdx = (int8_t)i;
        bestPriority = r.priority;
        bestId = r.id;
      }

      // simpan hasil evaluasi pada state aturan (untuk hysteresis)
      (void)desired;
    }

    if (bestIdx < 0) {
      continue; // tidak ada aturan untuk relay ini
    }

    const AutomationRule& winner = cfg.rules[bestIdx];

    bool desired = evaluateRule(winner, bestIdx);

    // Cooldown: batasi frekuensi switching (proteksi relay).
    uint16_t cooldownSec = winner.cooldownSec;

    if (cooldownSec == 0) {
      cooldownSec = AUTO_DEFAULT_COOLDOWN_SEC;
    }

    uint32_t cooldownMs = (uint32_t)cooldownSec * 1000UL;

    uint32_t now = millis();

    if (
      (uint32_t)(now - lastSwitchMs[relayIdx]) < cooldownMs
    ) {
      continue; // dalam masa cooldown
    }

    bool current = getRelayState(relayIdx);

    if (current == desired) {
      continue; // sudah sesuai
    }

    // Terapkan
    setRelay(relayIdx, desired);
    lastSwitchMs[relayIdx] = now;

    if (eventCb) {

      char reason[32];
      buildReason(winner, reason, sizeof(reason));

      eventCb(relayIdx, desired, bestIdx, reason);
    }
  }
}