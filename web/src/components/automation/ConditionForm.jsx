import DayPicker from "./DayPicker.jsx";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { minuteToHM, hmToMinute } from "../../utils/format.js";

function TimeRange({ value, onChange }) {
  const start = minuteToHM(value.startMin);
  const end = minuteToHM(value.endMin);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Mulai</Label>
          <Input
            type="time"
            value={start}
            onChange={(e) => onChange({ startMin: hmToMinute(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sampai</Label>
          <Input
            type="time"
            value={end}
            onChange={(e) => onChange({ endMin: hmToMinute(e.target.value) })}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Aktif setiap hari terpilih di rentang jam ini. Melewati tengah malam juga
        didukung.
      </p>
    </div>
  );
}

function ThresholdRow({ label, suffix, value, min, max, step, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-sm font-semibold">
          {(value / 10).toFixed(1)}
          <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
            {suffix}
          </span>
        </span>
      </div>
      <Slider
        min={min * 10}
        max={max * 10}
        step={Math.round(step * 10)}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function SensorThresholds({ value, onChange, suffix, min, max, step }) {
  const onVal = value.onValue || 0;
  const offVal = value.offValue || 0;

  return (
    <div className="space-y-5">
      <ThresholdRow
        label="Nyalakan saat nilai ≥"
        suffix={suffix}
        value={onVal}
        min={min}
        max={max}
        step={step}
        onChange={(v) => onChange({ onValue: v })}
      />
      <ThresholdRow
        label="Matikan saat nilai ≤"
        suffix={suffix}
        value={offVal > 0 ? offVal : onVal}
        min={min}
        max={max}
        step={step}
        onChange={(v) => onChange({ offValue: v })}
      />
      <p className="text-xs text-muted-foreground">
        Hysteresis: relay tidak "goyang" di sekitar ambang batas.
      </p>
    </div>
  );
}

export default function ConditionForm({ rule, onChange }) {
  const type = rule.type;

  const setDays = (days) => onChange({ days });

  return (
    <div className="space-y-4">
      {(type === "time" || type === "sched_temp") && (
        <>
          <div className="space-y-1.5">
            <Label>Hari aktif</Label>
            <DayPicker days={rule.days} onChange={setDays} />
          </div>
          <div className="space-y-1.5">
            <Label>Jadwal</Label>
            <TimeRange
              value={{ startMin: rule.startMin, endMin: rule.endMin }}
              onChange={onChange}
            />
          </div>
        </>
      )}

      {(type === "temp" || type === "sched_temp") && (
        <div className="space-y-1.5">
          <Label>Ambang suhu</Label>
          <SensorThresholds
            value={{ onValue: rule.onValue, offValue: rule.offValue }}
            onChange={onChange}
            suffix="°C"
            min={10}
            max={45}
            step={0.5}
          />
          {type === "temp" && (
            <p className="text-xs text-muted-foreground">
              Bila sensor bermasalah, aturan berbasis suhu otomatis dilewati
              sampai data valid kembali.
            </p>
          )}
        </div>
      )}

      {type === "hum" && (
        <div className="space-y-1.5">
          <Label>Ambang kelembapan</Label>
          <SensorThresholds
            value={{ onValue: rule.onValue, offValue: rule.offValue }}
            onChange={onChange}
            suffix="%"
            min={20}
            max={95}
            step={5}
          />
        </div>
      )}
    </div>
  );
}