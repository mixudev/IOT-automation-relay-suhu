#include "relay.h"
#include "config.h"

bool relayState[RELAY_COUNT];

void initRelays() {

  for (
    uint8_t i = 0;
    i < RELAY_COUNT;
    i++
  ) {

    pinMode(
      RELAY_PINS[i],
      OUTPUT
    );

    // Pastikan relay OFF saat boot
    setRelay(i, false);
  }
}

void setRelay(uint8_t index, bool state) {

  if (index >= RELAY_COUNT) {
    return;
  }

  // Abaikan jika state tidak berubah
  if (relayState[index] == state) {
    return;
  }

  relayState[index] = state;

  if (RELAY_ACTIVE_LOW) {
    digitalWrite(
      RELAY_PINS[index],
      state ? LOW : HIGH
    );
  } else {
    digitalWrite(
      RELAY_PINS[index],
      state ? HIGH : LOW
    );
  }

  Serial.print("[RELAY] Channel ");
  Serial.print(index + 1);
  Serial.println(state ? " -> ON" : " -> OFF");
}

void setAllRelays(bool state) {

  for (uint8_t i = 0; i < RELAY_COUNT; i++) {
    setRelay(i, state);
  }
}

bool getRelayState(uint8_t index) {

  if (index >= RELAY_COUNT) {
    return false;
  }

  return relayState[index];
}
