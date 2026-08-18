# ESP8266 Relay Controller - Pinout & Dokumentasi

Proyek NodeMCU ESP8266 untuk mengontrol 4 relay dan membaca sensor suhu/kelembapan DHT22 melalui web (lokal + jarak jauh via MQTT/Vercel).

## Wiring / Pinout

| Komponen   | Pin NodeMCU | GPIO | Keterangan                     |
|------------|-------------|------|--------------------------------|
| Relay IN1  | D1          | GPIO5 | Channel relay 1                |
| Relay IN2  | D2          | GPIO4 | Channel relay 2                |
| Relay IN3  | D5          | GPIO14 | Channel relay 3                |
| Relay IN4  | D6          | GPIO12 | Channel relay 4                |
| Relay GND  | GND         | -    | Ground relay                   |
| DHT22 DATA | D7          | GPIO13 | Data sensor DHT22              |
| DHT11 VCC  | 3V3         | -    | Catu daya 3.3V sensor          |
| DHT11 GND  | GND         | -    | Ground sensor                  |

## Skema Koneksi

```
NodeMCU (ES8266)
+--------------+
| D1 (GPIO5) ---- Relay Module IN1
| D2 (GPIO4) ---- Relay Module IN2
| D5 (GPIO14) --- Relay Module IN3
| D6 (GPIO12) --- Relay Module IN4
| GND ----------- Relay Module GND
|
| D7 (GPIO13) --- DHT22 DATA
| 3V3 ----------- DHT22 VCC
| GND ----------- DHT22 GND
+--------------+
```

## Konfigurasi Module Relay

Modul relay bersifat **ACTIVE LOW** (`RELAY_ACTIVE_LOW = true`):

- `HIGH` = relay OFF
- `LOW` = relay ON

> Jika modul relay Anda bersifat ACTIVE HIGH, ubah konstanta `RELAY_ACTIVE_LOW` menjadi `false` pada `src/config.h`.

## Konfigurasi WiFi & Kredensial (via .env)

Semua nilai rahasia (SSID/password WiFi, kredensial MQTT, deviceId) diisi **sekali** di file **`.env`** di root proyek, bukan di source code:

```ini
# salin .env.example sebagai .env, lalu isi nilai asli
WIFI_SSID=xxx
WIFI_PASS=xxx
MQTT_HOST=bf2dadfb68e84c79b1c595e47384d3d3.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USER=xxx
MQTT_PASS=xxx
MQTT_BROKER_URL=wss://bf2dadfb68e84c79b1c595e47384d3d3.s1.eu.hivemq.cloud:8884/mqtt
DEVICE_ID=iot_fcd5dea964a4
```

- **Firmware**: `scripts/gen_secrets.ps1` membaca `.env` → menulis `src/secrets.h` (di-gitignore). `src/config.h` memakai makro `SECRET_*`.
- **Web remote (Vercel)**: `web/scripts/build-config.js` membaca env Vercel (atau `.env` lokal) → menulis `web/config.gen.js` (di-gitignore).
- **Satu perintah**: `flash.ps1` (generate secrets + build/upload).

IP statis ESP8266 di-set ke `192.168.1.177` (lihat `src/config.h`). Sesuaikan gateway `192.168.1.1` dengan router Anda.

## Port / Endpoint (HTTP)

| Endpoint        | Method | Deskripsi                                    |
|-----------------|--------|----------------------------------------------|
| `/`             | GET    | Halaman web utama                            |
| `/status`       | GET    | JSON status semua relay + suhu + kelembapan  |
| `/sensor`       | GET    | JSON suhu & kelembapan DHT11                 |
| `/relay/1/on`   | GET    | Nyalakan relay 1                             |
| `/relay/1/off`  | GET    | Matikan relay 1                              |
| `/relay/2/on`   | GET    | Nyalakan relay 2                             |
| `/relay/2/off`  | GET    | Matikan relay 2                              |
| `/relay/3/on`   | GET    | Nyalakan relay 3                             |
| `/relay/3/off`  | GET    | Matikan relay 3                              |
| `/relay/4/on`   | GET    | Nyalakan relay 4                             |
| `/relay/4/off`  | GET    | Matikan relay 4                              |
| `/all/on`       | GET    | Nyalakan semua relay                         |
| `/all/off`      | GET    | Matikan semua relay                          |

Contoh respons `/status`:

```json
{
  "relay1": false,
  "relay2": true,
  "relay3": false,
  "relay4": false,
  "temperature": 30.0,
  "humidity": 65.0
}
```

Contoh respons `/sensor`:

```json
{
  "temperature": 30.0,
  "humidity": 65.0
}
```

## Port Serial

| Parameter         | Nilai   |
|-------------------|---------|
| Baud rate         | 9600    |
| Port              | COM3 (tergantung USB) |

> Tutup serial monitor sebelum `Upload`, agar port COM tidak terkunci.

## Library (PlatformIO)

Dideklarasikan di `platformio.ini`:

- `adafruit/DHT sensor library`
- `adafruit/Adafruit Unified Sensor`

## Struktur File (Modular)

```
src/
├── main.cpp         # setup + loop (orchestrasi)
├── config.h         # konfigurasi (memakai SECRET_* dari secrets.h)
├── secrets.h        # D/GENERATE otomatis dari .env (JANGAN di-commit)
├── relay.h/.cpp     # kontrol relay + state
├── sensor.h/.cpp    # baca DHT (median filter, anti-spike, validitas data)
├── status.h/.cpp    # JSON status & sensor (dipakai webserver + MQTT)
├── mqttclient.h/.cpp# koneksi MQTT TLS (HiveMQ Cloud) + parser perintah
├── webserver.h/.cpp # route HTTP lokal + endpoint JSON
└── webpage.h/.cpp   # halaman web HTML (terpisah agar mudah diedit)

scripts/
└── gen_secrets.ps1  # .env -> src/secrets.h

web/                 # aplikasi web untuk Vercel (remote control)
├── index.html       # UI
├── style.css        # styling
├── app.js           # logika MQTT + kontrol + grafik
├── config.template.js # template config (placeholder, bisa di-commit)
├── config.gen.js    # D/GENERATE dari env (JANGAN di-commit)
├── scripts/build-config.js # env/.env -> config.gen.js
├── package.json
├── vercel.json
└── vendor/mqtt.min.js

flash.ps1            # generate secrets + build/upload firmware
.env                 # semua kredensial (JANGAN di-commit)
.env.example         # contoh tanpa nilai rahasia (bisa di-commit)
```

Cara pengembangan:

- **Semua nilai rahasia** (WiFi, MQTT, deviceId) di satu file **`.env`** di root — sama untuk firmware & web.
- **Ganti pin/IP/pengaturan non-rahasia** → `src/config.h`.
- **Tambah endpoint HTTP** → `src/webserver.cpp`.
- **Tambah perintah MQTT** → `src/mqttclient.cpp` (`handleCommand`).
- **Edit tampilan web lokal** → `src/webpage.cpp`; **web remote** → `web/`.

## Kontrol Jarak Jauh (Web di Vercel)

Arsitekturnya: **ESP8266 dan web sama-sama terhubung ke broker MQTT**. ESP hanya konek keluar (cocok untuk jaringan rumah/NAT), jadi kontrol bisa dari mana saja tanpa perlu port forwarding.

```
Browser (Vercel, HTTPS)  ──WSS──►  Broker MQTT  ◄──TCP──  ESP8266 (rumah)
            │                          │                       │
            │      /command (set)       │                       ▼
            └───────────────────────────►                 relay & sensor
                                /status, /sensor (data)
```

### Topik MQTT

Prefix topik = `DEVICE_ID` (dari `.env`), saat ini `iot_fcd5dea964a4`.

| Topik              | Arah     | Isi                                              |
|--------------------|----------|--------------------------------------------------|
| `iot_fcd5dea964a4/command` | Web → ESP | `{"all":"on"}` / `{"all":"off"}` / `{"relay":2,"state":"on"}` |
| `iot_fcd5dea964a4/status`  | ESP → Web | `{"relay1":false,...,"temperature":30.0,"humidity":65.0}` |
| `iot_fcd5dea964a4/sensor`  | ESP → Web | `{"temperature":30.0,"humidity":65.0}`          |

### Langkah Setup

1. **Firmware** (`.env` di root):
   - Isi `WIFI_SSID`, `WIFI_PASS`, `MQTT_HOST`, `MQTT_PORT=8883`, `MQTT_USER`, `MQTT_PASS`, `MQTT_BROKER_URL`, `DEVICE_ID` (string unik Anda).
   - Build upload: `powershell -ExecutionPolicy Bypass -File flash.ps1` (atau `flash.ps1 -Target build` untuk compile saja).
   - Di serial monitor akan tampil `Connecting MQTT... connected!`.

2. **Web lokal (`web/`)**:
   - Jalankan `node web\scripts\build-config.js` dari root → menghasilkan `web/config.gen.js` dari `.env` (file ini jangan di-commit). Buka `web/index.html` di browser.

3. **Deploy ke Vercel** (dari GitHub):
   ```
   cd web
   git init
   git add .
   git commit -m "deploy: remote relay web"
   git remote add origin https://github.com/USERNAMA/REPO.git
   git branch -M main
   git push -u origin main
   ```
   - Import repo ke [vercel.com](https://vercel.com) → *Import Git Repository*.
   - Framework preset: **Other**. Build command: `npm install && npm run build` (dari `package.json`). Output directory: default.
   - Set **Environment Variables** di Vercel: `MQTT_BROKER_URL`, `MQTT_USER`, `MQTT_PASS`, `DEVICE_ID`.
   - Selesai: web remote tersedia di URL `https://...vercel.app`.

### Keamanan (semua gratis)

Konfigurasi saat ini memakai **HiveMQ Cloud Serverless** (free tier):
- ESP8266 terhubung via **TLS** (`WiFiClientSecure`, port 8883) → lalu lintas terenkripsi.
- `setInsecure()` → TLS tetap terenkripsi tapi sertifikat server tidak diverifikasi (tidak butuh NTP). Cukup untuk proyek hobi; untuk produksi gunakan verifikasi sertifikat penuh.
- Web terhubung via **WSS** (port 8884) dengan `username`/`password` broker.
- Perintah MQTT hanya diterima dari kredensial terdaftar → orang luar tidak bisa mengendalikan relay.

Lapisan proteksi lain yang aktif:

- **Parser MQTT di-hardening**: payload kosong/ambigu/terlalu besar ditolak; nomor relay divalidasi ketat (1–4).
- **Kunci akses web lokal** (`WEB_ACCESS_KEY`): endpoint kontrol wajib menyertakan `?key=`.
- **Power saving**: `WiFi.setSleepMode(WIFI_MODEM_SLEEP)` saat idle.

Peringatan penting:

- **JANGAN commit kredensial ke repo GitHub publik** — nilai rahasia ada di `.env`, `src/secrets.h`, dan `web/config.gen.js`. Ketiganya sudah masuk `.gitignore`; repo yang di-push hanya boleh berisi `.env.example`, `src/config.h`, dan `web/config.template.js` (placeholder).
- Kredensial di browser tetap bisa dilihat via Inspect → batasi siapa yang menerima URL halaman Vercel.
- Kunci web lokal hanya melindungi dari manipulasi acak di WiFi setempat (kuncinya tampil di HTML yang dikirim ESP).

## Cara Menjalankan

```
powershell -ExecutionPolicy Bypass -File flash.ps1 -Target build     # build saja
powershell -ExecutionPolicy Bypass -File flash.ps1                   # build + upload
```

`flash.ps1` otomatis: (1) generate `src/secrets.h` dari `.env`, (2) panggil PlatformIO.

Setelah upload, buka browser lalu akses `http://192.168.1.177/`.

## Troubleshooting: Sensor Tidak Muncul

Jika di halaman web suhu tetap `--.-°C`, pembacaan DHT gagal. Cek urutan berikut:

1. **Pin DATA** — pastikan ke **D7 / GPIO13**. (Ganti di `src/config.h` → `DHT_PIN`.)
2. **Catu daya** — DHT22 butuh **3.3–5.5V**. Pin `3V` (terukur ~3.0V) terlalu rendah dan membuat pembacaan tidak stabil. Usahakan pakai 5V.
3. **Pull-up** — sensor DHT modul biasanya sudah ada resistor pull-up 10k. Jika memakai bare tanpa modul, pasang resistor **4.7k–10k** dari DATA ke VCC.
4. **Kabel** — perpendek kabel (< 20 cm), hindari dekat kabel relay/motor (noise).
5. **Power relay** — modul relay memakai catu daya terpisah (jangan dari pin ESP8266 agar tegangan tidak drop).
6. Verifikasi di serial monitor: ESP8266 menampilkan pembacaan sensor di log saat `initSensor()`.

`/sensor` akan mengirim `null` jika pembacaan gagal:

```json
{ "temperature": null, "humidity": null }
```

### Sensor menunjukkan angka aneh (mis. suhu 1.2°C saat cuaca panas)

Nilai ekstrem/tidak masuk akal = sensor membaca **garbage**, bukan sekadar kurang akurat. Penyebab & solusinya:

1. **Tegangan catu daya rendah (paling sering).** DHT butuh **3.3–5.5V**. Pin `3V` (~3.0V) membuat sensor tidak stabil → nilai acak seperti `1.2°C`. Solusi: suplai VCC sensor dari pin `3V3` atau **5V terpisah**. Jangan ambil daya dari pin GPIO.
2. **Pull-up resistor.** DHT modul biasanya sudah ada pull-up 10k. Bare sensor WAJIB diberi resistor **4.7k–10k** dari DATA ke VCC.
3. **Kabel panjang/dekat relay.** Perpendek < 20cm dan jauhkan dari kabel relay/motor (noise).
4. **Sensor rusak/imitasi.** DHT11 lama sudah terbukti rusak → sudah diganti DHT22 (tipe di `src/sensor.cpp`, `DHT_TYPE DHT22`).

Perilaku filter di firmware:
- Nilai NaN atau di luar rentang (-10..60°C, 0..100%) → dibuang, nilai lama dipertahankan.
- Lompatan drastis (mis. 30°C → 1.2°C) → ditolak sebagai spike.
- Filter median atas 5 sampel → membuang garbage acak.

> Filter tidak bisa memperbaiki nilai yang **selalu** salah karena power. Cek poin 1–4 di atas dulu.