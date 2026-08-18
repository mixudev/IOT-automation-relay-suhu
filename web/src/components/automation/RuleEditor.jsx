import { useEffect, useState } from "react";
import Modal from "../ui/Modal.jsx";
import RelayPicker from "./RelayPicker.jsx";
import ConditionForm from "./ConditionForm.jsx";
import { RULE_TYPES } from "../../config.js";
import { ruleConditionLabel, relaysLabel } from "../../utils/format.js";

const TYPE_ORDER = ["time", "temp", "hum", "sched_temp"];

export default function RuleEditor({ open, initial, title, busy, onCancel, onSave }) {
  const [rule, setRule] = useState(null);

  useEffect(() => {
    if (open && initial) {
      setRule({
        ...initial,
        days: initial.days?.length ? initial.days : [],
        relays: initial.relays?.length ? initial.relays : [],
      });
    }
  }, [open, initial]);

  if (!rule) return null;

  const patch = (p) => setRule((r) => ({ ...r, ...p }));

  // Pengelompokan segmented jadi 2 baris
  const row1 = TYPE_ORDER.slice(0, 2);
  const row2 = TYPE_ORDER.slice(2);

  const valid =
    rule.relays.length > 0 &&
    rule.name.trim().length > 0;

  const summary =
    (rule.days.length > 0
      ? ruleConditionLabel(rule)
      : "Tentukan hari") +
    " · Relay: " +
    (rule.relays.length
      ? relaysLabel(rule.relays, [])
      : "belum dipilih");

  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid || busy) return;
          onSave(rule);
        }}
      >
        <div className="field">
          <label>Nama aturan</label>
          <input
            className="input"
            value={rule.name}
            placeholder="mis. Pompa taman pagi"
            maxLength={28}
            autoFocus
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Jenis kondisi</label>
          <Segmented
            row1={row1}
            row2={row2}
            active={TYPE_ORDER.indexOf(rule.type)}
            onPick={(idx) => patch({ type: TYPE_ORDER[idx] })}
          />
        </div>

        <div className="field">
          <label>Target relay</label>
          <RelayPicker relays={rule.relays} onChange={(relays) => patch({ relays })} />
        </div>

        <ConditionForm rule={rule} onChange={patch} />

        <div className="field">
          <label>Prioritas</label>
          <div className="seg">
            {[
              { v: 0, l: "Rendah" },
              { v: 10, l: "Normal" },
              { v: 20, l: "Tinggi" },
            ].map((o) => (
              <button
                type="button"
                key={o.v}
                className={rule.priority === o.v ? "active" : ""}
                onClick={() => patch({ priority: o.v })}
              >
                {o.l}
              </button>
            ))}
          </div>
          <div className="hint">
            Bila dua aturan bertabrakan, prioritas lebih tinggi menang.
          </div>
        </div>

        <div className="field">
          <label>Cooldown antar perubahan (detik)</label>
          <input
            type="number"
            className="input"
            min={0}
            max={3600}
            value={rule.cooldownSec}
            onChange={(e) => patch({ cooldownSec: parseInt(e.target.value, 10) || 0 })}
          />
          <div className="hint">
            Mencegah relay berubah terlalu sering saat kondisi mendekati ambang.
          </div>
        </div>

        {rule.name.trim() && rule.relays.length > 0 && (
          <div className="summary" style={{ marginTop: 4 }}>
            <b>{rule.name.trim()}</b> — {summary}
          </div>
        )}

        {rule.relays.length === 0 && (
          <div className="error-text">Pilih minimal satu relay target.</div>
        )}

        {rule.name.trim().length === 0 && (
          <div className="error-text">Nama aturan wajib diisi.</div>
        )}

        <div className="editor-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
            {busy ? "Menyimpan…" : "Simpan Aturan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Segmented({ row1, row2, active, onPick }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="seg">
        {row1.map((t, i) => (
          <button
            type="button"
            key={t}
            className={active === i ? "active" : ""}
            onClick={() => onPick(i)}
          >
            {RULE_TYPES[t].label}
          </button>
        ))}
      </div>
      <div className="seg">
        {row2.map((t, i) => (
          <button
            type="button"
            key={t}
            className={active === i + 2 ? "active" : ""}
            onClick={() => onPick(i + 2)}
          >
            {RULE_TYPES[t].label}
          </button>
        ))}
      </div>
    </div>
  );
}