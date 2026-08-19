#ifndef WIFI_H
#define WIFI_H

// Init: konfigurasi IP statis + koneksi (blocking sampai timeout).
void initWifi();
// Monitor & reconnect: panggil di loop() (intern rate-limited).
void wifiLoop();
// true bila WiFi terhubung (dipakai MQTT agar tidak spam connect).
bool wifiIsReady();

#endif