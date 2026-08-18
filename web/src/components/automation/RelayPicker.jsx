import { useAppStore } from "../../store/useAppStore.js";
import { RELAY_COUNT } from "../../config.js";

export default function RelayPicker({ relays, onChange }) {
  const names = useAppStore((s) => s.relayNames);

  const toggle = (n) => {
    onChange(
      relays.includes(n)
        ? relays.filter((x) => x !== n)
        : [...relays, n].sort((a, b) => a - b)
    );
  };

  return (
    <div className="relay-picker">
      {Array.from({ length: RELAY_COUNT }, (_, i) => {
        const n = i + 1;
        const selected = relays.includes(n);
        return (
          <button
            type="button"
            key={n}
            className={"relay-chip" + (selected ? " selected" : "")}
            onClick={() => toggle(n)}
          >
            <div className="rc-num">R{n}</div>
            <div className="rc-name">{names[n - 1] || "Relay " + n}</div>
          </button>
        );
      })}
    </div>
  );
}