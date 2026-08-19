import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, Check } from "lucide-react";
import RelayPicker from "./RelayPicker.jsx";
import ConditionForm from "./ConditionForm.jsx";
import { RULE_TYPES } from "../../config.js";
import { ruleConditionLabel, relaysLabel } from "../../utils/format.js";

const TYPE_ORDER = ["time", "temp", "timer", "sched_temp"];

const PRIORITY = [
  { v: 0, l: "Rendah" },
  { v: 10, l: "Normal" },
  { v: 20, l: "Tinggi" },
];

function StepDot({ n, label, active, done, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
        (active
          ? "border-primary/30 bg-primary/10 text-primary"
          : done
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-border bg-muted/40 text-muted-foreground")
      }
    >
      <span
        className={
          "grid size-4 place-items-center rounded-full text-[10px] font-semibold " +
          (active ? "bg-primary text-primary-foreground" : "bg-border/70")
        }
      >
        {done ? <Check className="size-3" /> : n}
      </span>
      {label}
    </button>
  );
}

function TypeButton({ type, active, onClick }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="flex-1"
    >
      {RULE_TYPES[type].label}
    </Button>
  );
}

export default function RuleEditor({ open, initial, title, busy, onCancel, onSave }) {
  const [rule, setRule] = useState(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open && initial) {
      setRule({
        ...initial,
        days: initial.days?.length ? initial.days : [],
        relays: initial.relays?.length ? initial.relays : [],
      });
      setStep(1);
    }
  }, [open, initial]);

  if (!rule) return null;

  const patch = (p) => setRule((r) => ({ ...r, ...p }));

  const isTimeType = rule.type === "time" || rule.type === "sched_temp";
  const isSensorType = rule.type === "temp" || rule.type === "sched_temp";

  const daysOk = !isTimeType || rule.days.length > 0;
  const thresholdOk = !isSensorType || rule.onValue > rule.offValue;
  const timerOk = rule.type !== "timer" || (rule.onSec >= 1 && rule.offSec >= 1);

  const valid =
    rule.relays.length > 0 &&
    rule.name.trim().length > 0 &&
    daysOk &&
    thresholdOk &&
    timerOk;

  const summary =
    (rule.days.length > 0
      ? ruleConditionLabel(rule)
      : "Tentukan hari") +
    " · Relay: " +
    (rule.relays.length
      ? relaysLabel(rule.relays, [])
      : "belum dipilih");

  const issues = [];
  if (!rule.name.trim()) issues.push("Tulis nama aturan.");
  if (rule.relays.length === 0) issues.push("Pilih minimal satu relay.");
  if (!daysOk) issues.push("Pilih minimal satu hari aktif.");
  if (!thresholdOk) issues.push("Ambang nyala harus lebih besar dari ambang mati.");
  if (!timerOk) issues.push("Durasi nyala & mati minimal 1 detik.");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onCancel()}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pb-3 pt-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 px-6 pb-4">
          <StepDot
            n={1}
            label="Kondisi"
            active={step === 1}
            done={step > 1}
            onClick={step > 1 ? () => setStep(1) : undefined}
          />
          <StepDot n={2} label="Relay & Setelan" active={step === 2} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid || busy) return;
            onSave(rule);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-1">
            {step === 1 ? (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="rule-name">Nama aturan</Label>
                  <Input
                    id="rule-name"
                    value={rule.name}
                    placeholder="mis. Pompa taman pagi"
                    maxLength={28}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Jenis kondisi</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {TYPE_ORDER.slice(0, 2).map((t) => (
                        <TypeButton
                          key={t}
                          type={t}
                          active={rule.type === t}
                          onClick={() => patch({ type: t })}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {TYPE_ORDER.slice(2).map((t) => (
                        <TypeButton
                          key={t}
                          type={t}
                          active={rule.type === t}
                          onClick={() => patch({ type: t })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <ConditionForm rule={rule} onChange={patch} />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label>Target relay</Label>
                  <RelayPicker
                    relays={rule.relays}
                    onChange={(relays) => patch({ relays })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Prioritas</Label>
                  <div className="flex gap-2">
                    {PRIORITY.map((o) => (
                      <Button
                        type="button"
                        key={o.v}
                        variant={rule.priority === o.v ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => patch({ priority: o.v })}
                      >
                        {o.l}
                      </Button>
                    ))}
                  </div>
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Menang atas aturan lain bila bertabrakan.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cooldown">Jeda antar perubahan (detik)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    min={0}
                    max={3600}
                    value={rule.cooldownSec}
                    onChange={(e) => patch({ cooldownSec: parseInt(e.target.value, 10) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cegah relay berganti terlalu sering di dekat ambang batas.
                  </p>
                </div>

                {rule.name.trim() && rule.relays.length > 0 && (
                  <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <b className="text-foreground">{rule.name.trim()}</b> — {summary}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t px-6 py-3.5">
            {issues.length > 0 && (
              <div className="mb-2 space-y-0.5 text-xs text-red-600">
                {issues.map((msg) => (
                  <p key={msg}>· {msg}</p>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                Batal
              </Button>
              <div className="flex gap-2">
                {step === 2 && (
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Kembali
                  </Button>
                )}
                {step === 1 ? (
                  <Button type="button" onClick={() => setStep(2)}>
                    Lanjut
                  </Button>
                ) : (
                  <Button type="submit" disabled={!valid || busy}>
                    {busy ? "Menyimpan…" : "Simpan Aturan"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}