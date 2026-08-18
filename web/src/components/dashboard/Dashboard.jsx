import { useAppStore } from "../../store/useAppStore.js";
import RelayCard from "./RelayCard.jsx";
import EventFeed from "./EventFeed.jsx";
import { fmtTemp, fmtHum } from "../../utils/format.js";
import { RELAY_COUNT } from "../../config.js";

function SensorCard({ label, value, unit, icon, accent }) {
  return (
    <div className="card sensor-card">
      <div className="sensor-top">
        <div className="eyebrow">{label}</div>
        <span className="chip" style={{ color: "var(--muted)" }}>
          {unit}
        </span>
      </div>
      <div className="sensor-value" style={{ color: accent }}>{value}</div>
      <div className="sensor-label">{unit}</div>
      <svg
        className="sensor-icon"
        viewBox="0 0 48 48"
        fill="currentColor"
        aria-hidden="true"
      >
        {icon}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const temperature = useAppStore((s) => s.temperature);
  const humidity = useAppStore((s) => s.humidity);
  const conn = useAppStore((s) => s.conn);
  const relayStates = useAppStore((s) => s.relayStates);
  const rulesActive = useAppStore((s) => s.rulesActive);
  const lastUpdate = useAppStore((s) => s.lastUpdate);

  const online = conn === "online";
  const relayOn = relayStates.filter(Boolean).length;

  const lastUpdateLabel = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  return (
    <div>
      <div className="grid-2">
        <SensorCard
          label="Suhu"
          value={fmtTemp(temperature)}
          unit="°C"
          accent="var(--orange)"
          icon={
            <path d="M24 4a8 8 0 0 1 8 8c0 4.2-2.6 6-4 8.2V38a4 4 0 0 1-8 0V20.2c-1.4-2.2-4-4-4-8.2a8 8 0 0 1 8-8zm-3 10a3 3 0 0 0 6 0 3 3 0 0 0-6 0z" />
          }
        />
        <SensorCard
          label="Kelembapan"
          value={fmtHum(humidity)}
          unit="%RH"
          accent="var(--teal)"
          icon={
            <path d="M24 4s14 16 14 26a14 14 0 0 1-28 0C10 20 24 4 24 4zm0 16c-3 4-6 6.5-6 10a6 6 0 0 0 12 0c0-3.5-3-6-6-10z" />
          }
        />
        <SensorCard
          label="Relay NYALA"
          value={relayOn}
          unit={"dari " + RELAY_COUNT}
          accent="var(--green)"
          icon={
            <path d="M14 4 6 22h2.8l6-12v12h2.4l8-8h-4.6L24 4h-4z" />
          }
        />
        <SensorCard
          label="Aturan Aktif"
          value={rulesActive}
          unit="automation"
          accent="var(--accent)"
          icon={
            <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 12h-2v2h2v-2zm0-8h-2v6h2V6z" />
          }
        />
      </div>

      <div className="section-gap">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Relay</div>
          </div>
          {!online && (
            <span className="chip" style={{ color: "var(--red)" }}>
              Perangkat tidak terhubung
            </span>
          )}
        </div>
        <div className="relay-grid">
          {Array.from({ length: RELAY_COUNT }, (_, i) => (
            <RelayCard key={i + 1} number={i + 1} />
          ))}
        </div>
      </div>

      <div className="section-gap">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Aktivitas</div>
          </div>
          <span className="stat-em">
            Terakhir update <b>{lastUpdateLabel}</b>
          </span>
        </div>
        <div className="card">
          <EventFeed limit={12} />
        </div>
      </div>
    </div>
  );
}