import { useAppStore } from "../../store/useAppStore.js";
import Toggle from "../ui/Toggle.jsx";
import { RULE_TYPES, TYPE_COLOR } from "../../config.js";
import {
  ruleConditionLabel,
  relaysLabel,
} from "../../utils/format.js";

export default function RuleCard({ rule, onEdit, onToggle, onRemove, onDup, disabled }) {
  const relayNames = useAppStore((s) => s.relayNames);

  const typeInfo = RULE_TYPES[rule.type] || RULE_TYPES.time;

  return (
    <div className="rule-card">
      <div className="rule-badge-col">
        <span className={"badge " + (TYPE_COLOR[rule.type] || "blue")}>
          {typeInfo.short}
        </span>
        <Toggle checked={rule.enabled} onChange={onToggle} disabled={disabled} label="Aktifkan aturan" />
      </div>

      <div className="rule-body">
        <div className="rule-name">
          {rule.name || "Aturan tanpa nama"}
          {!rule.enabled && <span className="chip">Nonaktif</span>}
          <span className="chip">
            P{rule.priority || 0}
          </span>
        </div>
        <div className="rule-cond">{ruleConditionLabel(rule)}</div>
        <div className="rule-body-meta">
          <span>
            ➔ {relaysLabel(rule.relays, relayNames)}
          </span>
          {rule.cooldownSec > 0 && (
            <span>· cooldown {rule.cooldownSec}s</span>
          )}
          {rule.type === "sched_temp" && rule.offValue > 0 && (
            <span>· sensor ≤ {(rule.offValue / 10).toFixed(1)}°C</span>
          )}
        </div>
      </div>

      <div className="rule-actions">
        <button className="btn btn-icon" onClick={onEdit} title="Edit" disabled={disabled}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
        <button className="btn btn-icon" onClick={onDup} title="Duplikat" disabled={disabled}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M4 16V6a2 2 0 0 1 2-2h10" />
          </svg>
        </button>
        <button className="btn btn-icon" onClick={onRemove} title="Hapus" disabled={disabled}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}