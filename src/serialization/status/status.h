#ifndef STATUS_H
#define STATUS_H

#include <Arduino.h>

String buildStatusJSON();
String buildSensorJSON();

// Full config (relayModes, relayNames, rules) untuk /config/resp.
String buildConfigJSON();

#endif