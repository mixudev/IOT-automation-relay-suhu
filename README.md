<div align="center">

# IOT Automation Relay Suhu

### ESP8266 NodeMCU — 4× Relay + DHT22 (Suhu & Kelembapan) — Dikontrol dari Web Lokal & Jarak Jauh

**Kontrol relay ON/OFF dari rumah & internet, tanpa backend, tanpa port forwarding.**

<br>

[![PlatformIO](https://img.shields.io/badge/PlatformIO-FF8000?style=for-the-badge&logo=platformio&logoColor=white)](https://platformio.org)
[![ESP8266](https://img.shields.io/badge/MCU-ESP8266%20NodeMCU-00979D?style=for-the-badge&logo=espressif&logoColor=white)](https://www.espressif.com/en/products/modules/esp8266)
[![MQTT](https://img.shields.io/badge/MQTT-HiveMQ%20Cloud-FF6600?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white)](https://www.hivemq.com/mqtt-cloud-broker/)
[![Vercel](https://img.shields.io/badge/Hosting-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Sensor](https://img.shields.io/badge/Sensor-DHT22-00897B?style=for-the-badge&logo=probot&logoColor=white)](https://learn.adafruit.com/dht)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br>

| Mode | Metode | Akses |
|------|--------|-------|
| Lokal | Web Server ESP8266 | `http://192.168.1.177/` |
| Jarak Jauh | MQTT via HiveMQ + Vercel | `https://iot-relay-ten.vercel.app/` |

</div>

---

## Daftar Isi

- [Fitur](#fitur)
- [Cara Kerja (Arsitektur)](#cara-kerja-arsitektur)
- [Wiring](#wiring)
- [Struktur Proyek](#struktur-proyek)
- [Pengaturan & Konfigurasi](#pengaturan--konfigurasi)
- [Cara Menjalankan](#cara-menjalankan)
- [Keamanan](#keamanan)
- [Troubleshoot](#troubleshoot)
- [Dokumentasi Lain](#dokumentasi-lain)
- [Lisensi](#lisensi)

---

## Fitur

- **4 kanal relay** (ON/OFF) — kontrol satuan atau semua sekaligus.
- **Mesin automation di perangkat**: aturan berbasis **jadwal harian**, **suhu**, **kelembapan**,
  **timer siklus** (nyala/mati berulang), dan **jadwal + suhu** (*sched_temp*), lengkap dengan
  prioritas, cooldown, hysteresis, dan mode per-relay `auto`/`manual` — dieksekusi langsung di
  ESP8266 (persisted di LittleFS), jadi tetap berjalan walau web/broker tidak aktif.
- **Sinkronisasi waktu NTP** (WIB, UTC+7) untuk akurasi aturan jadwal.
- **Sensor DHT22** suhu + kelembapan dengan filter *median 5 sampel*, *anti-spike*, dan *validitas data* — tahan terhadap pembacaan acak (garbage).
- **Web lokal** langsung dari ESP8266 (tanpa cloud, tanpa internet).
- **Web remote** (React SPA + MQTT.js) di Vercel — terhubung ke ESP melalui broker MQTT (HiveMQ Cloud, free tier).
- **TLS penuh**: firmware `WiFiClientSecure` (port 8883), web **WSS** (port 8884).
- **Keamanan berlapis**: parser MQTT di-hardening, kunci akses web lokal (`?key=`), kredensial MQTT wajib auth.
- **Hemat daya**: `WiFi.setSleepMode(WIFI_MODEM_SLEEP)` saat idle.
- **Dashboard React** dengan grafik riwayat suhu/kelembapan (recharts), log aktivitas, dan editor aturan.

---

## Cara Kerja (Arsitektur)

Kontrol jarak jauh **tanpa port forwarding** karena ESP8266 hanya membuat **koneksi keluar**
ke broker. Web dan ESP sama-sama *pub/sub* ke topik MQTT yang sama — tidak perlu server backend.

```
Browser (Vercel, HTTPS)
        │
        │ WSS (port 8884)  ────►  broker MQTT (HiveMQ Cloud, free tier)
        ▼                                  ▲
   /command › pub                        │ TCP + TLS (port 8883)
                                          │
                                          └──►  ESP8266 (rumah / NAT)
                                                   │
                                            ┌──────┴────────┐
                                            │ 4× Relay Module │   DHT22
                                            └────────────────┘   suhu & kelembapan
```

**Topik MQTT** (prefix = `DEVICE_ID`):

| Topik | Arah | Isi |
|-----------------------------|-----------|------------------------------------------------|
| `iot_fcd5dea964a4/command` | Web → ESP | `{"all":"on"}`, `{"all":"off"}`, `{"relay":2,"state":"on"}`, `{"relay":2,"mode":"auto"}`, `{"relay":2,"name":"..."}`, `{"reboot":true}` |
| `iot_fcd5dea964a4/status` | ESP → Web | status relay + suhu/lembap + relayModes/Names, time, ntpSynced |
| `iot_fcd5dea964a4/sensor` | ESP → Web | `{"temperature":30.0,"humidity":65.0}` |
| `iot_fcd5dea964a4/config/set` | Web → ESP | `{"v":1,"rules":[...]}` — simpan aturan automation |
| `iot_fcd5dea964a4/config/get` | Web → ESP | `{}` — minta kirim konfigurasi saat ini |
| `iot_fcd5dea964a4/config/resp` | ESP → Web | `{"ok":true,"rules":[...]}` / `{"ok":false,"error":"..."}` |
| `iot_fcd5dea964a4/event` | ESP → Web | `{"relay":1,"state":"on","source":"rule","ruleName":"..."}` |

---

## Wiring

| Komponen | Pin NodeMCU | GPIO |
|----------|-------------|------|
| Relay IN1 | D1 | GPIO5 |
| Relay IN2 | D2 | GPIO4 |
| Relay IN3 | D5 | GPIO14 |
| Relay IN4 | D6 | GPIO12 |
| DHT22 DATA | D7 | GPIO13 |
| Relay GND | GND | – |
| DHT22 VCC | 3V3 | – |
| DHT22 GND | GND | – |

> **PERHATIAN:** Modul relay bersifat **ACTIVE LOW** (`LOW` = ON, `HIGH` = OFF). Setel `RELAY_ACTIVE_LOW` di `src/config.h` jika modul Anda kebalikannya.
>
> **PERHATIAN:** DHT22 butuh daya **3.3–5.5V**; gunakan 5V bila pembacaan tidak stabil.

---

## Struktur Proyek

```
IOT-01/
├── .env / .env.example     # kredensial (rahasia -> jangan commit .env!)
├── flash.ps1               # generate secrets + build/upload firmware
├── platformio.ini          # config PlatformIO
├── PINOUT.md               # dokumentasi wiring & teknis lengkap
├── AGENTS.md               # panduan kerja untuk AI/agent/kontributor
├── scripts/
│   └── gen_secrets.ps1     # .env -> src/config/secrets.h
├── src/                    # firmware ESP8266 (modular)
│   ├── main.cpp            # setup + loop
│   ├── config/             # config.h (non-rahasia) + secrets.h (generated)
│   ├── hardware/           # relay/ & sensor/ (DHT22)
│   ├── services/           # wifi/ time/ automation/
│   ├── transport/          # mqtt/ & http/ (webserver + webpage)
│   └── serialization/      # status/ (JSON status & config)
└── web/                    # aplikasi web React (SPA) -> Vercel
    ├── index.html, vite.config.js, vercel.json
    ├── config.template.js / config.gen.js (anti-commit)
    ├── scripts/build-config.js
    ├── package.json
    └── src/                 # React (App, pages, Zustand stores, komponen)
```

---

## Pengaturan & Konfigurasi

Semua nilai rahasia (WiFi, MQTT, deviceId) disimpan di satu file **`.env`** di root,
lalu di-generate ke `src/config/secrets.h` dan `web/config.gen.js` (keduanya **anti-commit**).

```ini
# salin .env.example menjadi .env, lalu isi nilai asli
WIFI_SSID=...
WIFI_PASS=...
MQTT_HOST=xxx.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USER=...
MQTT_PASS=...
MQTT_BROKER_URL=wss://xxx.s1.eu.hivemq.cloud:8884/mqtt
DEVICE_ID=iot_fcd5dea964a4
```

> **PENTING:** Jangan pernah commit `.env`, `src/secrets.h`, atau `web/config.gen.js`.
> `.gitignore` sudah meng-exclude semuanya.

---

## Cara Menjalankan

### Firmware (ESP8266)

```powershell
# 1) build saja
powershell -ExecutionPolicy Bypass -File flash.ps1 -Target build

# 2) build + upload ke NodeMCU (tutup serial monitor dulu!)
powershell -ExecutionPolicy Bypass -File flash.ps1
```

- Setelah upload, buka **serial monitor (baud 9600)** hingga muncul `Connecting MQTT... connected!`.
- Akses web lokal di `http://192.168.1.177/`.

### Web remote (Vercel)

```bash
# build lokal + generate config dari .env (dev)
cd web
npm install
npm run build          # menjalankan scripts/build-config.js lalu vite build

# deploy production
vercel --prod --yes
```

**Env var wajib di Vercel** (`Settings → Environment Variables`):

| Key | Contoh |
|-----|--------|
| `MQTT_BROKER_URL` | `wss://xxx.s1.eu.hivemq.cloud:8884/mqtt` |
| `MQTT_USER` | user broker |
| `MQTT_PASS` | password broker |
| `DEVICE_ID` | `iot_fcd5dea964a4` |

---

## Keamanan

- **TLS**: firmware `WiFiClientSecure` + `setInsecure()` (tanpa verifikasi sertifikat — cukup untuk proyek hobi).
- **Auth MQTT**: broker wajib `username`/`password`.
- **Parser di-hardening**: tolak payload kosong/ambigu > 256B (perintah) / > 6KB (config/set); relay divalidasi 1–4.
- **Kunci web lokal** (`WEB_ACCESS_KEY`) wajib disertakan di `?key=` untuk endpoint kontrol.
- **Catatan:** karena tanpa backend, kredensial MQTT tetap terbaca di *Inspect* browser — batasi siapa yang menerima URL halaman.

---

## Troubleshoot

| Gejala | Solusi |
|--------|--------|
| Upload gagal `PermissionError(13)` | Tutup serial monitor/PuTTY yang memegang COM3 |
| Suhu tidak muncul (`--.-`) | Cek pin D7, daya 3.3–5.5V, pull-up 4.7k–10k, kabel < 20 cm |
| Suhu aneh (mis. `1.2°C`) | Daya rendah / sensor imitasi — pakai 5V & DHT22 asli |
| Web remote tidak konek | Cek `DEVICE_ID` & topik sama antara web dan firmware |

---

## Dokumentasi Lain

- **PINOUT.md** — wiring detail, endpoint HTTP, langkah setup, troubleshooting.
- **AGENTS.md** — panduan konsep & aturan kerja untuk AI/agent/kontributor.

---

## Lisensi

Dilisensikan di bawah [MIT License](LICENSE) © 2026 Lazuardi Mandegar.

---

<div align="center">
  <sub>ESP8266 · MQTT · Vercel — Proyek Hobi IoT</sub>
</div>
