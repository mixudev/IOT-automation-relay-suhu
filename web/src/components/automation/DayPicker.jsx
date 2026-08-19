import { DAY_SHORT } from "../../config.js";

const DAY_VARIANT = (on) =>
  on
    ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
    : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground";

export default function DayPicker({ days, onChange }) {
  const toggle = (d) => {
    const next = days.includes(d)
      ? days.filter((x) => x !== d)
      : [...days, d].sort((a, b) => a - b);
    onChange(next.length === 0 ? [d] : next);
  };

  const all = days.length === 7;
  const toggleAll = () => onChange(all ? [] : [0, 1, 2, 3, 4, 5, 6]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleAll}
        aria-pressed={all}
        className={
          "w-fit rounded-md border px-2.5 py-1 text-xs font-medium transition-colors " +
          (all ? DAY_VARIANT(true) : DAY_VARIANT(false))
        }
      >
        {all ? "Semua hari" : "Pilih semua"}
      </button>
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_SHORT.map((d, i) => {
          const on = days.includes(i);
          return (
            <button
              type="button"
              key={d}
              onClick={() => toggle(i)}
              aria-pressed={on}
              className={
                "flex h-9 flex-col items-center justify-center rounded-md border text-xs font-medium transition-colors " +
                DAY_VARIANT(on)
              }
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}