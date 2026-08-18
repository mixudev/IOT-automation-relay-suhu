import { useState } from "react";
import { useAppStore } from "../../store/useAppStore.js";
import Toggle from "../ui/Toggle.jsx";
import ConfirmDialog from "../ui/ConfirmDialog.jsx";
import CFG from "../../config.js";
import { useToastStore } from "../../store/useToastStore.js";

function ModeRow({ number, auto, onToggle, disabled }) {
  const name = useAppStore((s) => s.relayNames[number - 1]);
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">Relay {number} — {name || "Relay " + number}</div>
        <div className="setting-desc">
          {auto
            ? "Mode otomatis: aturan dapat mengendalikan relay ini"
            : "Mode manual: aturan diabaikan untuk relay ini"}
        </div>
      </div>
      <span className={"mode-tag " + (auto ? "auto" : "manual")}>
        {auto ? "Otomatis" : "Manual"}
      </span>
      <Toggle checked={auto} onChange={onToggle} disabled={disabled} label="Set mode" />
    </div>
  );
}

export default function Settings() {
  const conn = useAppStore((s) => s.conn);
  const relayNames = useAppStore((s) => s.relayNames);
  const relayModes = useAppStore((s) => s.relayModes);
  const setRelayName = useAppStore((s) => s.setRelayName);
  const setMode = useAppStore((s) => s.setMode);
  const reboot = useAppStore((s) => s.reboot);
  const time = useAppStore((s) => s.time);
  const ntpSynced = useAppStore((s) => s.ntpSynced);
  const lastUpdate = useAppStore((s) => s.lastUpdate);
  const toast = useToastStore((s) => s.push);
  const requestConfig = useAppStore((s) => s.requestConfig);

  const online = conn === "online";
  const [confirmReboot, setConfirmReboot] = useState(false);
  const [editingName, setEditingName] = useState(null); // number | null
  const [nameDraft, setNameDraft] = useState("");

  const startEditName = (n) => {
    setEditingName(n);
    setNameDraft(relayNames[n - 1] || "Relay " + n);
  };

  const saveName = () => {
    if (!editingName) return;
    const val = nameDraft.trim();
    if (!val) {
      toast({ type: "error", message: "Nama tidak boleh kosong" });
      return;
    }
    setRelayName(editingName, val);
    setEditingName(null);
    toast({ type: "success", message: "Nama relay diperbarui" });
  };

  const downloadConfig = () => {
    const cfg = {
      deviceId: CFG.deviceId,
      brokerUrl: CFG.brokerUrl,
      mqttUsername: CFG.mqttUsername,
      topics: {
        status: CFG.topicStatus,
        sensor: CFG.topicSensor,
        command: CFG.topicCommand,
        configSet: CFG.topicConfigSet,
        configGet: CFG.topicConfigGet,
        configResp: CFG.topicConfigResp,
        event: CFG.topicEvent,
      },
      relayNames,
      relayModes,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(cfg, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relay-config.json";
    a.click();
    URL.revokeObjectURL(url);

    toast({ type: "success", message: "File konfigurasi diunduh" });
  };

  const lastUpdateLabel = lastUpdate
    ? new Date(lastUpdate).toLocaleString("id-ID")
    : "—";

  return (
    <div>
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 4 }}>Mode Per-Relay</div>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--muted)",
            marginBottom: 4,
          }}
        >
          Mode <b>Otomatis</b> memberi aturan kebebasan mengontrol relay. Mode{" "}
          <b>Manual</b> mengunci relay hanya untuk kontrol langsung.
        </p>
        {Array.from({ length: 4 }, (_, i) => (
          <ModeRow
            key={i + 1}
            number={i + 1}
            auto={relayModes[i]}
            onToggle={(auto) => setMode(i + 1, auto)}
            disabled={!online}
          />
        ))}
      </div>

      <div className="card section-gap">
        <div className="eyebrow" style={{ marginBottom: 4 }}>Nama Relay</div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>
          Label yang tampil di dashboard, log, dan aturan. Tersimpan di perangkat.
        </p>
        {relayNames.map((name, i) => (
          <div className="setting-row" key={i}>
            <div>
              <div className="setting-label">Relay {i + 1}</div>
              {editingName === i + 1 ? (
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <input
                    className="input"
                    style={{ maxWidth: 240 }}
                    value={nameDraft}
                    maxLength={28}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                  />
                  <button className="btn btn-sm btn-primary" onClick={saveName} disabled={!online}>
                    Simpan
                  </button>
                  <button className="btn btn-sm" onClick={() => setEditingName(null)}>
                    Batal
                  </button>
                </div>
              ) : (
                <div className="setting-desc">{name || "—"}</div>
              )}
            </div>
            {editingName !== i + 1 && (
              <button className="btn btn-sm" onClick={() => startEditName(i + 1)} disabled={!online}>
                Ubah
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card section-gap">
        <div className="eyebrow" style={{ marginBottom: 4 }}>Perangkat</div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Device ID</div>
            <div className="setting-desc">Identitas perangkat di MQTT</div>
          </div>
          <div className="setting-value">{CFG.deviceId}</div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Waktu internal</div>
            <div className="setting-desc">Sumber untuk aturan jadwal</div>
          </div>
          <div className="setting-value" style={{ color: ntpSynced ? "var(--green)" : "var(--orange)" }}>
            {time || "—"} · {ntpSynced ? "NTP OK" : "belum sinkron"}
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Update terakhir</div>
            <div className="setting-desc">Status terakhir dari perangkat</div>
          </div>
          <div className="setting-value">{lastUpdateLabel}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button className="btn btn-sm" onClick={requestConfig} disabled={!online}>
            Minta config ulang
          </button>
          <button className="btn btn-sm" onClick={downloadConfig}>
            Unduh config JSON
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => setConfirmReboot(true)}
            disabled={!online}
          >
            Reboot perangkat
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReboot}
        title="Reboot perangkat?"
        message="ESP8266 akan restart. Konfigurasi & aturan tersimpan aman di memori perangkat."
        confirmLabel="Reboot"
        onCancel={() => setConfirmReboot(false)}
        onConfirm={() => {
          setConfirmReboot(false);
          reboot();
          toast({ type: "info", message: "Perintah reboot terkirim" });
        }}
      />
    </div>
  );
}