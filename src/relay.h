#ifndef RELAY_H
#define RELAY_H

#include <Arduino.h>

void initRelays();
void setRelay(uint8_t index, bool state);
void setAllRelays(bool state);
bool getRelayState(uint8_t index);

#endif
