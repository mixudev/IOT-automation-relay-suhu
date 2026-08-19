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

  const ruleName = rule.name || "Aturan tanpa nama";

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <div className="flex items-center gap-2.5">
        <Badge className={typeClass}>{typeInfo.short}</Badge>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
          {ruleName}
        </p>
        {!rule.enabled && (
          <Badge variant="outline" className="shrink-0 text-[11px]">
            Nonaktif
          </Badge>
        )}
        <Switch
          checked={rule.enabled}
          onCheckedChange={onToggle}
          disabled={disabled}
          aria-label={(rule.enabled ? "Nonaktifkan" : "Aktifkan") + " aturan " + ruleName}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {ruleConditionLabel(rule)}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Layers className="size-3.5 shrink-0" />
          <span className="truncate">{relaysLabel(rule.relays, relayNames)}</span>
          {rule.cooldownSec > 0 && (
            <span className="shrink-0 text-muted-foreground/75">
              · jeda {rule.cooldownSec}s
            </span>
          )}
        </span>

        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled} aria-label="Edit aturan" title="Edit aturan">
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDup} disabled={disabled} aria-label="Duplikat aturan" title="Duplikat aturan">
            <Copy />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Hapus aturan"
            title="Hapus aturan"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}