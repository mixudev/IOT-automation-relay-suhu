import { DAY_SHORT } from "../../config.js";

export default function DayPicker({ days, onChange }) {
  const toggle = (d) => {
    const next = days.includes(d)
      ? days.filter((x) => x !== d)
      : [...days, d].sort((a, b) => a - b);
    onChange(next.length === 0 ? [d] : next);
  };

  const setAll = (yes) => onChange(yes ? [0, 1, 2, 3, 4, 5, 6] : []);

  const all = days.length === 7;

  return (
    <div className="day-picker">
      <button
        type="button"
        className={"day-pill " + (all ? "on all" : "all")}
        onClick={() => setAll(!all)}
      >
        {all ? "Semua hari" : "Pilih semua"}
      </button>
      {DAY_SHORT.map((d, i) => (
        <button
          type="button"
          key={d}
          className={"day-pill" + (days.includes(i) ? " on" : "")}
          onClick={() => toggle(i)}
        >
          {d}
        </button>
      ))}
    </div>
  );
}