#include "relay.h"
#include "config/config.h"

bool relayState[RELAY_COUNT];

static void writeRelayPin(uint8_t index, bool state) {

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
}

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

    // Paksa tulis OFF. Jangan lewat setRelay() karena global
    // relayState sudah false saat boot (akan short-circuit) dan
    // pin tidak pernah benar-benar dimatikan.
    relayState[i] = false;
    writeRelayPin(i, false);
  }
}

// Tulis pin dan perbarui state tanpa cek kesamaan (boot/restore).
void forceRelayState(uint8_t index, bool state) {

  if (index >= RELAY_COUNT) {
    return;
  }

  relayState[index] = state;
  writeRelayPin(index, state);

  Serial.print("[RELAY] Ch ");
  Serial.print(index + 1);
  Serial.print(" restore -> ");
  Serial.println(state ? "ON" : "OFF");
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
  writeRelayPin(index, state);

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
