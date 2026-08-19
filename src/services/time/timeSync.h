#ifndef TIME_SYNC_H
#define TIME_SYNC_H

#include <Arduino.h>

void initTimeSync();
void timeSyncLoop();
bool timeIsSynced();

// Menit lokal hari ini (0..1439) — digunakan oleh aturan jadwal.
uint16_t getLocalMinuteOfDay();
// 0 = Senin ... 6 = Minggu — matching bitmask days di aturan.
uint8_t getLocalDayOfWeek();
// Epoch detik (UTC) — dipakai aturan tipe timer (fase berulang).
uint32_t getEpochSec();

#endif