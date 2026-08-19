#ifndef SENSOR_H
#define SENSOR_H

#include <Arduino.h>

void initSensor();
void updateSensor();
bool sensorIsValid();
float getTemperature();
float getHumidity();

#endif
