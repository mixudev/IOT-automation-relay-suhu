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
    <div className="grid grid-cols-2 gap-1.5">
      {Array.from({ length: RELAY_COUNT }, (_, i) => {
        const n = i + 1;
        const selected = relays.includes(n);
        return (
          <button
            type="button"
            key={n}
            onClick={() => toggle(n)}
            aria-pressed={selected}
            className={
              "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors " +
              (selected
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent")
            }
          >
            <span className="font-mono text-xs font-bold">R{n}</span>
            <span className="truncate text-xs">{names[n - 1] || "Relay " + n}</span>
          </button>
        );
      })}
    </div>
  );
}