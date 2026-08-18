import DayPicker from "./DayPicker.jsx";
import { minuteToHM, hmToMinute } from "../../utils/format.js";

function TimeRange({ value, onChange }) {
  const start = minuteToHM(value.startMin);
  const end = minuteToHM(value.endMin);

  return (
    <div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label>Mulai</label>
          <input
            type="time"
            className="input"
            value={start}
            onChange={(e) => onChange({ startMin: hmToMinute(e.target.value) })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Sampai</label>
          <input
            type="time"
            className="input"
            value={end}
            onChange={(e) => onChange({ endMin: hmToMinute(e.target.value) })}
          />
        </div>
      </div>
      <div className="hint">
        Aktif setiap hari terpilih di rentang jam ini. Melewati tengah malam juga
        didukung.
      </div>
    </div>
  );
}

function SensorThresholds({ type, value, onChange, suffix, min, max, step }) {
  const onVal = value.onValue || 0;
  const offVal = value.offValue || 0;

  return (
    <div>
      <label>
        Nyalakan saat nilai ≥ <b>{onVal / 10}{suffix}</b>
      </label>
      <input
        type="range"
        className="slider"
        min={min * 10}
        max={max * 10}
        step={Math.round(step * 10)}
        value={onVal}
        onChange={(e) =>
          onChange({ onValue: parseInt(e.target.value, 10) || 0 })
        }
      />
      <label style={{ marginTop: 14 }}>
        Matikan saat nilai ≤ <b>{offVal / 10}{suffix}</b>
      </label>
      <input
        type="range"
        className="slider"
        min={min * 10}
        max={max * 10}
        step={Math.round(step * 10)}
        value={offVal > 0 ? offVal : onVal}
        onChange={(e) =>
          onChange({ offValue: parseInt(e.target.value, 10) || 0 })
        }
      />
      <div className="hint">
        Hysteresis: relay tidak "goyang" di sekitar ambang batas.
      </div>
    </div>
  );
}

export default function ConditionForm({ rule, onChange }) {
  const type = rule.type;

  const setDays = (days) => onChange({ days });

  return (
    <div>
      {type === "time" && (
        <>
          <div className="field">
            <label>Hari aktif</label>
            <DayPicker days={rule.days} onChange={setDays} />
          </div>
          <div className="field">
            <label>Jadwal</label>
            <TimeRange
              value={{ startMin: rule.startMin, endMin: rule.endMin }}
              onChange={onChange}
            />
          </div>
        </>
      )}

      {type === "temp" && (
        <div className="field">
          <SensorThresholds
            type="temp"
            value={{ onValue: rule.onValue, offValue: rule.offValue }}
            onChange={onChange}
            suffix="°C"
            min={10}
            max={45}
            step={0.5}
          />
          <div className="hint">
            Bila sensor bermasalah, aturan berbasis suhu otomatis dilewati sampai
            data valid kembali.
          </div>
        </div>
      )}

      {type === "hum" && (
        <div className="field">
          <SensorThresholds
            type="hum"
            value={{ onValue: rule.onValue, offValue: rule.offValue }}
            onChange={onChange}
            suffix="%"
            min={20}
            max={95}
            step={5}
          />
        </div>
      )}

      {type === "sched_temp" && (
        <>
          <div className="field">
            <label>Hari aktif</label>
            <DayPicker days={rule.days} onChange={setDays} />
          </div>
          <div className="field">
            <label>Jadwal</label>
            <TimeRange
              value={{ startMin: rule.startMin, endMin: rule.endMin }}
              onChange={onChange}
            />
          </div>
          <div className="field">
            <SensorThresholds
              type="temp"
              value={{ onValue: rule.onValue, offValue: rule.offValue }}
              onChange={onChange}
              suffix="°C"
              min={10}
              max={45}
              step={0.5}
            />
          </div>
        </>
      )}
    </div>
  );
}