export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
  "aria-label": ariaLabel,
}) {
  return (
    <label className="switch" aria-label={label || ariaLabel}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
      />
      <span className="track"></span>
    </label>
  );
}