import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore.js";
import { useRulesStore } from "../../store/useRulesStore.js";
import RuleCard from "./RuleCard.jsx";
import RuleEditor from "./RuleEditor.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { RULE_TYPES } from "../../config.js";

export const emptyRule = () => ({
  id: 0,
  name: "",
  enabled: true,
  relays: [],
  type: "time",
  days: [1, 2, 3, 4, 5],
  startMin: 6 * 60,
  endMin: 18 * 60,
  onValue: 0,
  offValue: 0,
  priority: 10,
  cooldownSec: 60,
});

export default function Automation() {
  const conn = useAppStore((s) => s.conn);
  const [editing, setEditing] = useState(null); // null | { idx, rule }

  const rules = useRulesStore((s) => s.rules);
  const syncState = useRulesStore((s) => s.syncState);
  const addRule = useRulesStore((s) => s.addRule);
  const updateRule = useRulesStore((s) => s.updateRule);
  const toggleRule = useRulesStore((s) => s.toggleRule);
  const removeRule = useRulesStore((s) => s.removeRule);
  const dupRule = useRulesStore((s) => s.dupRule);
  const fetch = useRulesStore((s) => s.fetch);

  const online = conn === "online";

  const byType = useMemo(() => {
    const m = { time: [], temp: [], hum: [], sched_temp: [] };
    rules.forEach((r) => m[r.type]?.push(r));
    return m;
  }, [rules]);

  const total = rules.length;
  const activeCount = rules.filter((r) => r.enabled).length;

  const openCreate = () =>
    setEditing({ idx: null, rule: { ...emptyRule(), id: 0 } });

  const openEdit = (idx) => {
    const rule = useRulesStore.getState().rules[idx];
    if (rule) setEditing({ idx, rule: { ...rule } });
  };

  const handleSave = (rule) => {
    if (editing.idx === null) {
      addRule(rule);
    } else {
      updateRule(editing.idx, rule);
    }
    setEditing(null);
  };

  const busy = syncState === "saving";

  return (
    <div>
      <div className="toolbar">
        <div className="stat-em">
          <b>{activeCount}</b> dari <b>{total}</b> aturan aktif
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={fetch} disabled={!online || syncState === "fetching"}>
            {syncState === "fetching" ? "Menyinkron…" : "Sinkron"}
          </button>
          <button className="btn btn-primary" onClick={openCreate} disabled={!online}>
            + Aturan Baru
          </button>
        </div>
      </div>

      {syncState === "error" && (
        <div className="warn-banner" style={{ color: "var(--red)", background: "var(--red-soft)" }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          Terjadi masalah sinkron. Coba <button className="btn btn-sm" onClick={fetch}>muat ulang</button>.
        </div>
      )}

      {rules.length === 0 && !busy ? (
        <div className="card">
          <EmptyState
            icon="⚡"
            title="Belum ada aturan automation"
            text="Buat aturan bertenaga jadwal atau sensor — semua dieksekusi langsung di atas ESP8266."
            action={
              <button className="btn btn-primary" onClick={openCreate} disabled={!online}>
                + Buat Aturan Pertama
              </button>
            }
          />
        </div>
      ) : (
        Object.keys(RULE_TYPES).map((type) => {
          const list = byType[type];
          if (list.length === 0) return null;

          return (
            <div className="section-gap" key={type}>
              <div className="stat-em" style={{ marginBottom: 10 }}>
                <b>{RULE_TYPES[type].label}</b> ({list.length})
              </div>
              <div className="rule-list">
                {list.map((rule, i) => {
                  const idx = rules.indexOf(rule);
                  return (
                    <div className="card" key={rule.id}>
                      <RuleCard
                        rule={rule}
                        onEdit={() => openEdit(idx)}
                        onToggle={() => toggleRule(idx)}
                        onRemove={() => removeRule(idx)}
                        onDup={() => dupRule(idx)}
                        disabled={!online}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <RuleEditor
        open={!!editing}
        initial={editing ? editing.rule : null}
        title={editing && editing.idx === null ? "Aturan Baru" : "Edit Aturan"}
        busy={busy}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  );
}