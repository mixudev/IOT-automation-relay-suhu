import { useAppStore } from "../../store/useAppStore.js";
import { Badge } from "@/components/ui/badge";
import { Power } from "lucide-react";

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
      <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
        <Power className="size-7 text-muted-foreground/40" />
        <p className="text-sm font-medium">Belum ada aktivitas</p>
        <p className="text-xs text-muted-foreground">
          Perubahan status relay akan tampil di sini saat terjadi.
        </p>
      </div>
    );
  }

  const list = events.slice(0, limit);

  return (
    <div>
      {list.map((ev, i) => {
        const on = ev.state === "on";
        const name = relayNames[ev.relay - 1];
        const relayLabel = ev.relay
          ? "Relay " + ev.relay + (name ? " · " + name : "")
          : "";

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
          desc =
            "Perangkat boot — " + relayLabel + " " + (on ? "aktif" : "mati");
        } else {
          desc = (on ? "Nyalakan " : "Matikan ") + relayLabel;
        }

        return (
          <div
            key={i}
            className="flex items-center gap-3 border-b px-3.5 py-2.5 last:border-b-0"
          >
            <span className="w-11 shrink-0 font-mono text-[11px] text-muted-foreground">
              {ev.ts}
            </span>
            <span
              className={
                "w-8 shrink-0 text-[11px] font-bold " +
                (on ? "text-emerald-600" : "text-red-600")
              }
            >
              {on ? "ON" : "OFF"}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={desc}>
              {desc}
            </span>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {SRC_LABEL[ev.source] || ev.source}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}