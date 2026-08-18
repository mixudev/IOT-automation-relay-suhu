#include "status.h"
#include "config.h"
#include "relay.h"
#include "sensor.h"

String buildStatusJSON() {

  String json = "{";

  for (uint8_t i = 0; i < RELAY_COUNT; i++) {

    json += "\"relay";
    json += String(i + 1);
    json += "\":";
    json += getRelayState(i) ? "true" : "false";

    if (i < RELAY_COUNT - 1) {
      json += ",";
    }
  }

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