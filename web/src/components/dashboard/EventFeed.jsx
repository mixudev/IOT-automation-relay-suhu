import { useAppStore } from "../../store/useAppStore.js";
import EmptyState from "../ui/EmptyState.jsx";

const SRC_LABEL = {
  manual: "Manual",
  rule: "Aturan",
  http: "Web lokal",
  mqtt: "MQTT",
  boot: "Boot",
};

export default function EventFeed({ limit = 12 }) {
  const events = useAppStore((s) => s.events);
  const relayNames = useAppStore((s) => s.relayNames);

  if (events.length === 0) {
    return (
      <EmptyState
        icon="◌"
        title="Belum ada aktivitas"
        text="Perubahan status relay akan tampil di sini saat terjadi."
      />
    );
  }

  const list = events.slice(0, limit);

  return (
    <div className="event-list">
      {list.map((ev, i) => {
        const on = ev.state === "on";
        const name = relayNames[ev.relay - 1];
        const relayLabel = ev.relay ? "Relay " + ev.relay + (name ? " · " + name : "") : "";

        let desc = "";
        if (ev.source === "rule") {
          desc =
            (on ? "Nyalakan " : "Matikan ") +
            relayLabel +
            " oleh aturan " +
            (ev.ruleName || "sensor");
        } else if (ev.source === "manual" || ev.source === "http") {
          desc = (on ? "Nyalakan " : "Matikan ") + relayLabel + " secara manual";
        } else if (ev.source === "mqtt") {
          desc = (on ? "Nyalakan " : "Matikan ") + relayLabel + " via MQTT";
        } else if (ev.source === "boot") {
          desc = "Perangkat boot — " + relayLabel + " " + (on ? "aktif" : "mati");
        } else {
          desc = (on ? "Nyalakan " : "Matikan ") + relayLabel;
        }

        return (
          <div className="event-item" key={i}>
            <span className="event-time">{ev.ts}</span>
            <span className={"event-state " + ev.state}>{on ? "ON" : "OFF"}</span>
            <span className="event-desc" title={desc}>
              {desc}
            </span>
            <span className="chip" style={{ flexShrink: 0 }}>
              {SRC_LABEL[ev.source] || ev.source}
            </span>
          </div>
        );
      })}
    </div>
  );
}