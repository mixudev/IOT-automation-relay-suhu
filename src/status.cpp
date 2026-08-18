#include "status.h"
#include "config.h"
#include "relay.h"
#include "sensor.h"
#include "automation.h"
#include "timeSync.h"
#include <ArduinoJson.h>

// =====================================================
// STATUS (dipakai /status, /sensor, publish MQTT)
// =====================================================

static const char* ruleTypeStr(uint8_t type) {

  switch (type) {
    case RULE_TIME:       return "time";
    case RULE_TEMP:       return "temp";
    case RULE_HUM:        return "hum";
    case RULE_SCHED_TEMP: return "sched_temp";
    case RULE_TIMER:      return "timer";
    default:              return "time";
  }
}

String buildStatusJSON() {

  String json = "{";

  // Relay states
  for (uint8_t i = 0; i < RELAY_COUNT; i++) {

    json += "\"relay";
    json += String(i + 1);
    json += "\":";
    json += getRelayState(i) ? "true" : "false";

    if (i < RELAY_COUNT - 1) {
      json += ",";
    }
  }

  // Relay modes (AUTO/MANUAL)
  json += ",\"relayModes\":[";

  for (uint8_t i = 0; i < RELAY_COUNT; i++) {
    json += automationGetRelayMode(i) ? "true" : "false";

    if (i < RELAY_COUNT - 1) {
      json += ",";
    }
  }

  json += "]";

  // Relay names
  json += ",\"relayNames\":[";

  for (uint8_t i = 0; i < RELAY_COUNT; i++) {

    json += "\"";
    json += automationGetRelayName(i);
    json += "\"";

    if (i < RELAY_COUNT - 1) {
      json += ",";
    }
  }

  json += "]";

  // Sensor
  json += ",\"temperature\":";

  if (sensorIsValid()) {
    json += String(getTemperature());
  } else {
    json += "null";
  }

  json += ",\"humidity\":";

  if (sensorIsValid()) {
    json += String(getHumidity());
  } else {
    json += "null";
  }

  // Waktu NTP
  json += ",\"time\":";

  if (timeIsSynced()) {

    uint16_t min = getLocalMinuteOfDay();

    char timeBuf[8];
    snprintf(
      timeBuf,
      sizeof(timeBuf),
      "%02u:%02u",
      (unsigned)(min / 60) % 24,
      (unsigned)(min % 60)
    );

    json += "\"";
    json += timeBuf;
    json += "\"";

  } else {

    json += "null";
  }

  json += ",\"ntpSynced\":";
  json += timeIsSynced() ? "true" : "false";

  json += ",\"rulesActive\":";
  json += String(automationGetRuleCount());

  json += "}";

  return json;
}

String buildSensorJSON() {

  String json = "{";

  json += "\"temperature\":";

  if (sensorIsValid()) {
    json += String(getTemperature());
  } else {
    json += "null";
  }

  json += ",\"humidity\":";

  if (sensorIsValid()) {
    json += String(getHumidity());
  } else {
    json += "null";
  }

  json += "}";

  return json;
}

// =====================================================
// CONFIG (kirim ke web: relayModes + relayNames + rules)
// =====================================================

String buildConfigJSON() {

  JsonDocument doc; // v7: heap-backed

  doc["ok"] = true;
  doc["v"] = 1;

  JsonArray modes = doc["relayModes"].to<JsonArray>();

  for (uint8_t i = 0; i < RELAY_COUNT; i++) {
    modes.add(automationGetRelayMode(i));
  }

  JsonArray names = doc["relayNames"].to<JsonArray>();

  for (uint8_t i = 0; i < RELAY_COUNT; i++) {
    names.add(automationGetRelayName(i));
  }

  JsonArray rules = doc["rules"].to<JsonArray>();

  for (uint8_t i = 0; i < automationGetRuleCount(); i++) {

    const AutomationRule& r = automationGetRule(i);

    JsonObject rule = rules.add<JsonObject>();

    rule["id"] = r.id;
    rule["name"] = r.name;
    rule["enabled"] = r.enabled;
    rule["type"] = ruleTypeStr(r.type);
    rule["priority"] = r.priority;
    rule["cooldownSec"] = r.cooldownSec;

    JsonArray rels = rule["relays"].to<JsonArray>();

    for (uint8_t b = 0; b < RELAY_COUNT; b++) {
      if (r.relays & (1 << b)) {
        rels.add(b + 1);
      }
    }

    if (r.type == RULE_TIME || r.type == RULE_SCHED_TEMP) {

      JsonArray days = rule["days"].to<JsonArray>();

      for (uint8_t d = 0; d < 7; d++) {
        if (r.days & (1 << d)) {
          days.add(d);
        }
      }

      rule["startMin"] = r.startMin;
      rule["endMin"] = r.endMin;
    }

    if (r.type == RULE_TEMP || r.type == RULE_HUM || r.type == RULE_SCHED_TEMP) {
      rule["onValue"] = r.onValue;
      rule["offValue"] = r.offValue;
    }

    if (r.type == RULE_TIMER) {
      rule["onSec"] = r.onSec;
      rule["offSec"] = r.offSec;
    }
  }

  String out;
  serializeJson(doc, out);

  return out;
}