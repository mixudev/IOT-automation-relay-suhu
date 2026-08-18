import { useAppStore } from "../../store/useAppStore.js";

function PowerIcon({ on }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M12 2v9" />
      {on ? (
        <path d="M18.4 6.6a8 8 0 1 1-12.8 0" />
      ) : (
        <path d="M18.4 6.6a8 8 0 1 1-12.8 0" fillOpacity="0.12" />
      )}
    </svg>
  );
}

export default function RelayCard({ number }) {
  const name = useAppStore((s) => s.relayNames[number - 1]);
  const on = useAppStore((s) => s.relayStates[number - 1]);
  const auto = useAppStore((s) => s.relayModes[number - 1]);
  const conn = useAppStore((s) => s.conn);
  const manualRelay = useAppStore((s) => s.manualRelay);
  const setMode = useAppStore((s) => s.setMode);

  const online = conn === "online";

  const toggle = () => {
    if (!online) return;
    manualRelay(number, !on);
  };

  const toggleMode = () => {
    if (!online) return;
    setMode(number, !auto);
  };

  return (
    <div className={"card relay-card"}>
      <div className="relay-head">
        <span className="relay-num">R{number}</span>
        <span className={"relay-status" + (on ? " on" : "")}>
          {on ? "ON" : "OFF"}
        </span>
      </div>

      <div className="relay-name">{name || "Relay " + number}</div>
      <div className="relay-desc">
        Relay {number} · {on ? "aktif" : "mati"}
      </div>

      <div className="relay-row">
        <span className="row-label">Mode</span>
        <span className={"mode-tag " + (auto ? "auto" : "manual")} onClick={toggleMode}>
          {auto ? "⚡ Otomatis" : "• Manual"}
        </span>
      </div>

      <div className="relay-row">
        <span className="row-label">
          {on ? "Matikan" : "Nyalakan"}
        </span>
        <button
          className={"btn btn-sm " + (on ? "btn-off" : "btn-on")}
          onClick={toggle}
          disabled={!online}
          aria-label={"Relay " + number + (on ? " mati" : " nyala")}
        >
          <PowerIcon on={on} />
          {on ? "Matikan" : "Nyalakan"}
        </button>
      </div>
    </div>
  );
}