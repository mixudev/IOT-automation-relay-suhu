# AGENTS.md — Panduan untuk AI / Agent / Kontributor

> Dokumen ini khusus untuk membantu **AI software agent** (opencode, Copilot, dll.)
> dan kontributor memahami konsep proyek, cara kerja, serta aturan wajib.
> Baca sampai selesai sebelum mengubah/menambah kode.

---

## 1. Konsep Singkat

Proyek **IOT-Automation-Relay-Suhu** adalah sistem IoT untuk:

- Mengontrol **4 relay** (ON/OFF) dari ESP8266 NodeMCU.
- Membaca **suhu & kelembapan** dari sensor **DHT22**.
- Kontrol dari **2 tempat**:
  1. **Web lokal** — server HTTP di dalam ESP8266 (`http://192.168.1.177/`, hanya dalam WiFi rumah).
  2. **Web remote (Vercel)** — halaman statis di cloud, terhubung ke ESP **melalui broker MQTT** (HiveMQ Cloud serverless, free tier).

Arsitektur utama (mengapa bisa dikontrol jarak jauh tanpa port forwarding):

```
Browser (Vercel, HTTPS)  ──WSS──►  Broker MQTT (HiveMQ Cloud)
                                          ▲
                                          │ TCP + TLS
                                    ESP8266 (rumah/NAT)
                                          │
                                   ┌──────┴──────┐
                                   │ 4× Relay    │ DHT22
                                   │             │ suhu/lembap
```

- ESP8266 hanya membuat **koneksi keluar** → cocok untuk jaringan rumah biasa.
- Web dan ESP sama-sama pub/sub ke MQTT → tidak butuh backend server.
- Tanpa backend = kredensial MQTT tetap ada di JavaScript sisi klien (diterima untuk
  proyek hobi; batasi siapa yang menerima URL halaman).

### Mesin Automation (di ESP8266)

- **Sumber kebenaran aturan = di ESP8266** (persisted di LittleFS, file `auto.bin`).
  Web hanya editor; setiap perubahan dikirim via `config/set` lalu ESP membalas `config/resp`.
- Mesin automation menyediakan 5 tipe aturan: `time` (jadwal harian), `temp` (suhu), `hum`
  (kelembapan — dipakai firmware, tak lagi diekspos web), `timer` (siklus nyala/mati berulang
  via `onSec`/`offSec`, berbasis epoch NTP dan melanjutkan fase setelah reboot), `sched_temp`
  (jadwal + ambang suhu). Setiap aturan punya prioritas, cooldown, dan daftar relay target.
- Mode per-relay `auto`/`manual` menentukan apakah aturan boleh mengontrol relay itu;
  kontrol manual dari web **mengambil alih** mode ke `manual`. Nilai sensor memakai
  satuan `x10` (mis. 32.0°C = 320).

---

## 2. Struktur Proyek

```
.
├── .env                  # SEMUA kredensial (anti commit) — dibaca oleh tooling
├── .env.example          # template nilai rahasia (boleh commit)
├── .gitignore            # mengecualikan secrets + file generated
├── flash.ps1             # generate secrets → build/upload firmware
├── platformio.ini        # build config ESP8266 (PlatformIO)
├── PINOUT.md             # wiring & dokumentasi teknis lengkap
├── scripts/
│   └── gen_secrets.ps1   # .env → src/config/secrets.h
├── src/                  # firmware ESP8266 (terstruktur per modul kategori)
│   ├── main.cpp          # setup() + loop() (orchestrasi)
│   ├── config/
│   │   ├── config.h      # konstanta non-rahasia (pin, IP, MAX_RULES, NTP)
│   │   └── secrets.h     # GENERATED dari .env (anti commit)
│   ├── hardware/
│   │   ├── relay/        # kontrol relay + state + restore saat boot
│   │   └── sensor/       # DHT22: median filter, anti-spike, validitas data
│   ├── services/
│   │   ├── wifi/         # koneksi STA + IP statis + reconnect periodik
│   │   ├── time/         # sinkronisasi waktu NTP (untuk aturan jadwal)
│   │   └── automation/   # mesin aturan (time/temp/timer/sched_temp) + persist
│   ├── transport/
│   │   ├── mqtt/         # MQTT TLS, reconnect non-blocking, parser JSON
│   │   └── http/         # endpoint HTTP lokal + halaman web ESP
│   └── serialization/
│       └── status/       # JSON status & config (web + MQTT, via ArduinoJson)
└── web/                  # aplikasi web React (SPA) → deploy ke Vercel
    ├── index.html        # entry (memuat /src/main.jsx)
    ├── config.template.js# template placeholder (boleh commit)
    ├── config.gen.js     # GENERATED dari env (anti commit)
    ├── scripts/build-config.js # env/.env → web/config.gen.js
    ├── vite.config.js, package.json, vercel.json
    └── src/
        ├── main.jsx / App.jsx     # bootstrap + layout + navigasi
        ├── config.js              # CFG + konstanta bersama (RULE_TYPES, dsb)
        ├── globals.css            # design system (light-only, indigo)
        ├── mqtt/client.js / router.js # koneksi WSS + routing pesan → store
        ├── store/                 # Zustand: useAppStore, useRulesStore
        ├── components/            # ui/, dashboard/, automation/, history/, settings/
        └── utils/format.js        # helper format (huruf hari, susunan jam, label)
```

---

## 3. Alur Konfigurasi (PENTING)

Ada **satu sumber kebenaran**: file **`.env`** di root (lokal) atau **Environment Variables**
di dashboard Vercel (cloud). **Jangan pernah hardcode kredensial di source code.**

### Firmware (ESP8266)

```
.env (lokal)
   │
   ▼  scripts/gen_secrets.ps1
src/config/secrets.h  →  makro  SECRET_WIFI_SSID, SECRET_WIFI_PASS,
                    SECRET_MQTT_HOST, SECRET_MQTT_PORT, SECRET_MQTT_USER,
                    SECRET_MQTT_PASS, SECRET_DEVICE_ID
   ▼
src/config/config.h pakai SECRET_* untuk nilai rahasia + konstanta biasa (pin, IP)
   ▼
platformio run (build_flags = -I src → include berprefix modul)
```

- Nilai **non-rahasia** (pin, IP statis, `WEB_ACCESS_KEY`, `DEVICE_ID` scaffold) → `src/config/config.h`.
  Catatan: `DEVICE_ID` nyata berada di `.env` dan masuk ke firmware lewat `secrets.h`;
  `config.h` hanya fallback/kompilasi.
- `secretes.h` TIDAK boleh diedit manual (selalu ditimpa oleh generator).

### Web (Vercel)

```
.env (lokal, dev)  /  Env Vars Vercel (production)
   │
   ▼  web/scripts/build-config.js
web/config.gen.js  →  CFG.brokerUrl / CFG.mqttUsername / CFG.mqttPassword / CFG.deviceId
   ▼
web/index.html memuat config.gen.js
```

- `config.template.js` berisi placeholder `__MQTT_BROKER_URL__` dll — satu-satunya yang
  boleh di-commit untuk konfigurasi web.
- Vercel `vercel.json` menjalankan `node scripts/build-config.js` saat build → environment
  variables Vercel otomatis tersulubstitusi.

---

## 4. Perintah yang Dipakai

| Tujuan                             | Perintah (dari root proyek)                                                                  |
|------------------------------------|---------------------------------------------------------------------------------------------|
| Build firmware                     | `powershell -ExecutionPolicy Bypass -File flash.ps1 -Target build`                          |
| Gen secrets dari .env              | `powershell -ExecutionPolicy Bypass -File scripts\gen_secrets.ps1`                          |
| Build + upload ke NodeMCU          | `powershell -ExecutionPolicy Bypass -File flash.ps1`                                        |
| Gen config web dari .env           | `node web\scripts\build-config.js` (dari root)                                              |
| Deploy web ke Vercel (production)  | `cd web; vercel --prod --yes`                                                               |
| Push semua (commit + tag + push)   | lihat bagian *Workflow Git*                                                                 |

**Peringatan upload**: pastikan **serial monitor/PuTTY ditutup** sebelum upload —
kalau tidak: `PermissionError(13, 'Access is denied.')` pada port COM3.
Cek port bebas: `platformio device list`.

---

## 5. Topik MQTT

Prefix = `DEVICE_ID` (contoh saat ini `iot_fcd5dea964a4`).

| Topik                   | Arah      | Isi                                             |
|-------------------------|-----------|--------------------------------------------------|
| `<DEVICE_ID>/command`   | Web → ESP | `{"all":"on"}` / `{"all":"off"}` / `{"relay":2,"state":"on"}` / `{"relay":2,"mode":"auto"|"manual"}` / `{"relay":2,"name":"..."}` / `{"reboot":true}` |
| `<DEVICE_ID>/status`    | ESP → Web | status relay + suhu/lembap terbaru + relayModes, relayNames, time, ntpSynced |
| `<DEVICE_ID>/sensor`    | ESP → Web | `{"temperature":30.0,"humidity":65.0}`           |
| `<DEVICE_ID>/config/set`  | Web → ESP | `{"v":1,"rules":[...]}` — simpan semua aturan (QoS 1) |
| `<DEVICE_ID>/config/get`  | Web → ESP | `{}` — minta kirim konfigurasi/aturan saat ini   |
| `<DEVICE_ID>/config/resp` | ESP → Web | `{"ok":true,"rules":[...]}` / `{"ok":false,"error":"no_relay_selected"}` |
| `<DEVICE_ID>/event`     | ESP → Web | `{"relay":2,"state":"on","source":"rule","ruleName":"..."}` |

- Transport web: **WSS** port 8884; firmware: **TCP+TLS** port 8883 (HiveMQ serverless).
- Perintah dari broker menggunakan **QoS 1** (subscribe command/config, dan publish status).
  Parser di `mqttclient.cpp` menolak payload kosong/ambigu/terlalu besar (>256B perintah;
  `config/set` maks. ~6KB), nomor relay divalidasi 1–4, dan aturan divalidasi
  (ambang `onValue > offValue`, rentang jam 0–1439, minimal 1 hari aktif, dua fase timer ≥ 1 s).

---

## 6. Pin / Wiring Penting

| Fungsi      | Pin NodeMCU | GPIO |
|-------------|-------------|------|
| Relay IN1–4 | D1, D2, D5, D6 | 5, 4, 14, 12 |
| DHT22 DATA  | D7          | 13  |
| Relay GND   | GND      | -   |
| DHT VCC     | 3V3       | -   |

- Relay **ACTIVE LOW** (`RELAY_ACTIVE_LOW=true` di `src/config.h`).
- Semua pengaturan pin ada di `src/config.h`.

---

## 7. Aturan Wajib untuk Agent/Dev

### Keamanan (tidak bisa ditawar)
1. **JANGAN PERNAH** commit `.env`, `src/config/secrets.h`, atau `web/config.gen.js`.
2. Jangan menulis kredensial literal ke dalam source/file apa pun. Kalau terlanjur,
   segera hapus + rotasi password bersangkutan.
3. `.gitignore` sudah meng-exclude file rahasia — jangan pernah `git add -f` file itu.
4. Setelah konfigurasi berubah, **regenerate** file generated (`gen_secrets.ps1` /
   `build-config.js`) — jangan edit manual.

### Kualitas
- Patuhi struktur modular: satu tanggung jawab per file (`relay`, `sensor`, `status`, `mqttclient`, `webserver`, `webpage`).
- ESP8266 RAM kecil (80KB) — hindari alokasi besar / string dinamis di dalam loop sensor/MQTT; utamakan buffer tetap & ringkas.
- Sensor memakai **filter median 5 sampel + anti-spike + validitas data** — jangan "kurangi proteksi" ini dengan alasan kecepatan.
- Update `PINOUT.md` / `AGENTS.md` jika menambah pin, endpoint, topik, atau perubahan struktur.
- Selalu cek hasil dengan **build** sebelum menganggap selesai.

### Workflow Git (WAJIB)
1. Selesai satu tugas → **commit** dengan pesan jelas & ringkas (conventional: `feat:`, `fix:`, `docs:`, `refactor:`).
2. **Push** ke `main` bila build/verifikasi tidak ada error: `git push origin main`.
3. Rilis fitur besar → beri **tag versi** (mis. `v1.0.0`) dan push tag: `git push origin --tags`.
4. Jangan commit file tanpa sengaja; cek `git status` sebelum commit.

---

## 8. Stack & Info Teknis

| Aspek            | Nilai                                |
|------------------|--------------------------------------|
| MCU              | ESP8266 NodeMCU 0.9 (4MB flash)      |
| Framework        | Arduino + ESP8266 core 3.1.2         |
| Build system     | PlatformIO (espressif8266)           |
| Broker           | HiveMQ Cloud Serverless (TLS 8883 / WSS 8884) |
| Frontend web     | HTML/CSS/JS murni + mqtt.js (WSS)    |
| Hosting web      | Vercel (static, build = build-config)|
| Bahasa dokumentasi | Indonesia (utama)                  |

---

## 9. Checklist Selesai Tugas

- [ ] Regenerate secrets/config bila env berubah.
- [ ] Build sukses (`flash.ps1 -Target build`).
- [ ] (Opsional) deploy web: `vercel --prod --yes`.
- [ ] Commit dengan pesan jelas.
- [ ] Push `git push origin main` (dan tag bila rilis).
- [ ] Tidak ada file rahasia di `git status` / isi commit.
```