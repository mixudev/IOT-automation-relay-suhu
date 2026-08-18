import { useAppStore } from "../../store/useAppStore.js";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Copy, Trash2, Layers } from "lucide-react";
import { RULE_TYPES, TYPE_COLOR } from "../../config.js";
import { ruleConditionLabel, relaysLabel } from "../../utils/format.js";

const TYPE_CLASS = {
  blue: "bg-indigo-50 text-indigo-700 border-indigo-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  gradient: "bg-primary text-primary-foreground border-primary",
};

export default function RuleCard({ rule, onEdit, onToggle, onRemove, onDup, disabled }) {
  const relayNames = useAppStore((s) => s.relayNames);

  const typeInfo = RULE_TYPES[rule.type] || RULE_TYPES.time;
  const typeClass =
    TYPE_CLASS[TYPE_COLOR[rule.type]] || TYPE_CLASS.blue;

  return (
    <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3">
        <Badge className={typeClass}>{typeInfo.short}</Badge>
        <Switch
          checked={rule.enabled}
          onCheckedChange={onToggle}
          disabled={disabled}
          aria-label="Aktifkan aturan"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold leading-tight">
            {rule.name || "Aturan tanpa nama"}
          </p>
          {!rule.enabled && (
            <Badge variant="outline" className="text-[10px]">
              Nonaktif
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">
            P{rule.priority || 0}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ruleConditionLabel(rule)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="size-3" />
            {relaysLabel(rule.relays, relayNames)}
          </span>
          {rule.cooldownSec > 0 && (
            <span className="text-muted-foreground/70">· cooldown {rule.cooldownSec}s</span>
          )}
          {rule.type === "sched_temp" && rule.offValue > 0 && (
            <span className="text-muted-foreground/70">
              · sensor ≤ {(rule.offValue / 10).toFixed(1)}°C
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onEdit} disabled={disabled} aria-label="Edit">
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDup} disabled={disabled} aria-label="Duplikat">
          <Copy />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={disabled}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          aria-label="Hapus"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}