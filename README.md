<div align="center">

# 🛠️ IOT Automation Relay Suhu

### ESP8266 NodeMCU — 4× Relay + DHT22 (Suhu & Kelembapan) — Diotrol dari Web Lokal & Jarak Jauh

**Kontrol relay ON/OFF dari rumah & internet, tanpa backend, tanpa port forwarding.**

<br>

[![PlatformIO](https://img.shields.io/badge/PlatformIO-FF8000?style=for-the-badge&logo=platformio&logoColor=white)](https://platformio.org)
[![ESP8266](https://img.shields.io/badge/MCU-ESP8266%20NodeMCU-00979D?style=for-the-badge&logo=espressif&logoColor=white)](https://www.espressif.com/en/products/modules/esp8266)
[![HiveMQ MQTT](https://img.shields.io/badge/MQTT-HiveMQ%20Cloud-FF6600?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white)](https://www.hivemq.com/mqtt-cloud-broker/)
[![Vercel](https://img.shields.io/badge/Hosting-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Sensor](https://img.shields.io/badge/Sensor-DHT22-00897B?style=for-the-badge&logo=probot&logoColor=white)](https://learn.adafruit.com/dht)

<br>

| Status | Mode | Remote Access |
|--------|------|---------------|
| ✅ **Lokal** | Web Server ESP8266 | `http://192.168.1.177/` |
| ✅ **Jarak Jauh** | MQTT via HiveMQ + Vercel | `https://iot-relay-ten.vercel.app/` |

</div>

---

## 🚀 Fitur

- ⚡ **4 chanel relay** (ON/OFF) — kontrol satuan atau semua sekaligus.
- 🌡️ **Sensor DHT22** suhu + kelembapan dengan filter: *median 5 sampel*, *anti-spike*, *validitas data* → tahan error baca acak.
- 🖥️ **Web lokal** langsung dari ESP8266 (tanpa cloud, tanpa internet).
- ☁️ **Web remote** statis di Vercel — terhubung ke ESP **lewat broker MQTT** (HiveMQ Cloud, free tier).
- 🔐 **TLS penuh**: firmware `WiFiClientSecure` (port 8883), web **WSS** (port 8884).
- 🔒 **Anti-hacking ringan**: parser MQTT di-hardening, kunci akses web lokal (`?key=`), kredensial MQTT wajib auth.
- 💾 **Hemat daya**: `WiFi.setSleepMode(WIFI_MODEM_SLEEP)` saat idle.
- 🎨 **Grafik canvas** di web remote untuk riwayat suhu/kelembapan.

---

## 🧠 Cara Kerja (Arsitektur)

Kontrol jarak jauh **tanpa port forwarding** karena ESP8266 hanya membuat **koneksi keluar**
ke broker. Web & ESP sama-sama *pub/sub* ke topik MQTT yang sama — tidak perlu server backend.

```
🌐 Browser (Vercel, HTTPS)
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
| `iot_fcd5dea964a4/command` | Web → ESP | `{"all":"on"}`, `{"all":"off"}`, `{"relay":2,"state":"on"}` |
| `iot_fcd5dea964a4/status` | ESP → Web | status relay + suhu/lembap terkini |
| `iot_fcd5dea964a4/sensor` | ESP → Web | `{"temperature":30.0,"humidity":65.0}` |

---

## 🔌 Wiring

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

> ⚠️ Relay modul bersifat **ACTIVE LOW** (`LOW` = ON, `HIGH` = OFF). Setel `RELAY_ACTIVE_LOW` di `src/config.h` jika modul Anda kebalikan.
> ⚠️ DHT22 butuh daya **3.3–5.5V**; pakai 5V bila pembacaan tidak stabil.

---

## 📁 Struktur Proyek

```
IOT-01/
├── .env / .env.example     # kredensial (rahasia → jangan commit .env!)
├── flash.ps1               # generate secrets + build/upload firmware
├── platformio.ini          # config PlatformIO
├── PINOUT.md               # dokumentasi wiring & teknis lengkap
├── AGENTS.md               # panduan kerja untuk AI/agent/kontributor
├── scripts/
│   └── gen_secrets.ps1     # .env → src/secrets.h
├── src/                    # firmware ESP8266 (modular)
│   ├── main.cpp            # setup + loop
│   ├── config.h            # konfigurasi non-rahasia
│   ├── relay/ sensor/ status/ mqttclient/ webserver/ webpage/
├── web/                    # aplikasi web remote → Vercel
│   ├── index.html, app.js, style.css
│   ├── config.template.js / config.gen.js
│   ├── scripts/build-config.js
│   └── package.json, vercel.json
```

---

## ⚙️ Pengaturan & Konfigurasi

Semua rahasia (WiFi, MQTT, deviceId) disimpan **di satu file `.env`** di root,
kelak di-generate ke `src/secrets.h` & `web/config.gen.js` (keduanya **anti-commit**).

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

> ⛔ **JANGAN pernah commit** `.env`, `src/secrets.h`, atau `web/config.gen.js`.
> `.gitignore` sudah meng-exclude semuanya.

---

## 🛠️ Cara Menjalankan

### Firmware (ESP8266)

```powershell
# 1) build saja
powershell -ExecutionPolicy Bypass -File flash.ps1 -Target build

# 2) build + upload ke NodeMCU (tutup serial monitor dulu!)
powershell -ExecutionPolicy Bypass -File flash.ps1
```

- Setelah upload, buka **serial monitor (baud 9600)** → akan muncul `Connecting MQTT... connected!`.
- Akses web lokal di `http://192.168.1.177/`.

### Web remote (Vercel)

```bash
# generate config dari .env (lokal / dev)
node web/scripts/build-config.js

# deploy production
cd web && vercel --prod --yes
```

**Env var wajib di Vercel** (`Settings → Environment Variables`):

| Key | Contoh |
|-----|--------|
| `MQTT_BROKER_URL` | `wss://xxx.s1.eu.hivemq.cloud:8884/mqtt` |
| `MQTT_USER` | user broker |
| `MQTT_PASS` | password broker |
| `DEVICE_ID` | `iot_fcd5dea964a4` |

---

## 🔐 Keamanan

- **TLS**: firmware `WiFiClientSecure` + `setInsecure()` (tanpa verifikasi sertifikat — cukup untuk hobi).
- **Auth MQTT**: broker wajib `username`/`password`.
- **Parser di-hardening**: tolak payload kosong/ambigu > 128B; relay divalidasi 1–4.
- **Kunci web lokal** (`WEB_ACCESS_KEY`) wajib di `?key=` untuk endpoint kontrol.
- ⚠️ Karena **tanpa backend**, kredensial MQTT tetap terbaca di *Inspect* browser → batasi siapa yang menerima URL halaman.

---

## 🧪 Troubleshoot

| Gejala | Solusi |
|--------|--------|
| Upload gagal `PermissionError(13)` | Tutup serial monitor/PuTTY yang memegang COM3 |
| Suhu tidak muncul (`--.-`) | Cek pin D7, daya 3.3–5.5V, pull-up 4.7k–10k, kabel < 20 cm |
| Suhu aneh (mis. `1.2°C`) | Daya rendah / sensor imitasi → pakai 5V & DHT22 asli |
| Web remote tidak konek | Cek `DEVICE_ID` & topik sama antara web dan firmware |

---

## 📚 Lebih Lanjut

- 📄 **PINOUT.md** — wiring detail, endpoint HTTP, langkah setup, troubleshooting.
- 🤖 **AGENTS.md** — panduan konsep & aturan kerja untuk AI/agent/kontributor.

## 📜 Lisensi

[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

<div align="center">
  <sub>Dibuat dengan ❤️ untuk proyek hobi IoT · ESP8266 · MQTT · Vercel</sub>
</div>