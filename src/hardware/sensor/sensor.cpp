#include "sensor.h"
#include "config/config.h"
#include <DHT.h>

#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

// =====================================================
// MEDIAN FILTER
// =====================================================

// Jumlah sampel yang dipakai untuk menghitung median.
// Median menyingkirkan lonjakan/garbage acak.
const uint8_t SAMPLE_MAX = 5;

float tempSamples[SAMPLE_MAX];
float humSamples[SAMPLE_MAX];
uint8_t sampleCount = 0;

// =====================================================
// STATE
// =====================================================

float lastTemperature = NAN;
float lastHumidity = NAN;
bool lastValid = false;

uint32_t lastRead = 0;

// Anti-spike: berapa kali nilai drastis ditolak berturut-turut
uint8_t rejectCount = 0;

static float medianValue(float values[], uint8_t len) {

  // Bubble sort sederhana
  for (uint8_t i = 0; i < len - 1; i++) {
    for (uint8_t j = i + 1; j < len; j++) {
      if (values[j] < values[i]) {
        float tmp = values[i];
        values[i] = values[j];
        values[j] = tmp;
      }
    }
  }

  if (len % 2 == 1) {
    return values[len / 2];
  }

  return (values[len / 2 - 1] + values[len / 2]) / 2.0f;
}

// =====================================================
// PUBLIC API
// =====================================================

void initSensor() {

  dht.begin();

  updateSensor();
}

void updateSensor() {

  if (millis() - lastRead < DHT_INTERVAL_MS) {
    return;
  }

  lastRead = millis();

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  // Batas rentang masuk akal DHT22.
  // Nilai di luar ini (termasuk NaN) = bacaan rusak, dibuang.
  if (
    isnan(t) ||
    isnan(h) ||
    t < -10.0 ||
    t > 60.0 ||
    h < 0.0 ||
    h > 100.0
  ) {

    Serial.println(
      "[SENSOR] Pembacaan tidak valid "
      "(NaN / di luar rentang), pakai nilai lama"
    );

    return;
  }

  // Simpan sampel valid (geser jika penuh)
  if (sampleCount < SAMPLE_MAX) {

    tempSamples[sampleCount] = t;
    humSamples[sampleCount] = h;
    sampleCount++;

  } else {

    for (uint8_t i = 0; i < SAMPLE_MAX - 1; i++) {
      tempSamples[i] = tempSamples[i + 1];
      humSamples[i] = humSamples[i + 1];
    }

    tempSamples[SAMPLE_MAX - 1] = t;
    humSamples[SAMPLE_MAX - 1] = h;
  }

  // Butuh minimal 2 sampel agar median mulai berguna
  if (sampleCount < 2) {
    return;
  }

  float mt =
    medianValue(
      tempSamples,
      sampleCount
    );

  float mh =
    medianValue(
      humSamples,
      sampleCount
    );

  // Anti-spike: lompatan drastis (mis. 30 -> 1.2) ditolak.
  // Tapi tetap diterima setelah 3x berturut-turut (jaga-jaga
  // kalau sensor benar-benar pindah lokasi).
  if (
    lastValid &&
    (
      fabs(mt - lastTemperature) > 10.0 ||
      fabs(mh - lastHumidity) > 30.0
    )
  ) {

    rejectCount++;

    if (rejectCount >= 3) {

      rejectCount = 0;

      lastTemperature = mt;
      lastHumidity = mh;

      Serial.print(
        "[SENSOR] Nilai baru diterima: Suhu: "
      );
      Serial.print(mt, 1);
      Serial.print(" C | Kelembapan: ");
      Serial.print(mh, 1);
      Serial.println(" %");
    } else {

      Serial.println(
        "[SENSOR] Perubahan drastis ditolak "
        "(spike) - pakai nilai lama"
      );
    }

    return;
  }

  rejectCount = 0;

  lastTemperature = mt;
  lastHumidity = mh;
  lastValid = true;

  Serial.print("[SENSOR] Suhu: ");
  Serial.print(mt, 1);
  Serial.print(" C | Kelembapan: ");
  Serial.print(mh, 1);
  Serial.println(" %");
}

bool sensorIsValid() {
  return lastValid;
}

float getTemperature() {
  return lastTemperature;
}

float getHumidity() {
  return lastHumidity;
}
