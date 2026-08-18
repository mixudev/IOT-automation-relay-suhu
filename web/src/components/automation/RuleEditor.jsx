import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
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

  const valid = rule.relays.length > 0 && rule.name.trim().length > 0;

  const summary =
    (rule.days.length > 0
      ? ruleConditionLabel(rule)
      : "Tentukan hari") +
    " · Relay: " +
    (rule.relays.length
      ? relaysLabel(rule.relays, [])
      : "belum dipilih");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onCancel()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid || busy) return;
            onSave(rule);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Nama aturan</Label>
            <Input
              id="rule-name"
              value={rule.name}
              placeholder="mis. Pompa taman pagi"
              maxLength={28}
              autoFocus
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

          <div className="space-y-1.5">
            <Label>Target relay</Label>
            <RelayPicker relays={rule.relays} onChange={(relays) => patch({ relays })} />
          </div>

          <Separator />

          <ConditionForm rule={rule} onChange={patch} />

          <Separator />

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
              Bila dua aturan bertabrakan, prioritas lebih tinggi menang.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cooldown">Cooldown antar perubahan (detik)</Label>
            <Input
              id="cooldown"
              type="number"
              min={0}
              max={3600}
              value={rule.cooldownSec}
              onChange={(e) => patch({ cooldownSec: parseInt(e.target.value, 10) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Mencegah relay berubah terlalu sering saat kondisi mendekati ambang.
            </p>
          </div>

          {rule.name.trim() && rule.relays.length > 0 && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <b className="text-foreground">{rule.name.trim()}</b> — {summary}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy ? "Menyimpan…" : "Simpan Aturan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}