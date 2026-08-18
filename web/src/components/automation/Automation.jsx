import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore.js";
import { useRulesStore } from "../../store/useRulesStore.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Zap, TriangleAlert } from "lucide-react";
import RuleCard from "./RuleCard.jsx";
import RuleEditor from "./RuleEditor.jsx";
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

  const openCreate = () => setEditing({ idx: null, rule: { ...emptyRule(), id: 0 } });

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{activeCount}</span> dari{" "}
          <span className="font-semibold text-foreground">{total}</span> aturan aktif
        </p>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetch}
            disabled={!online || syncState === "fetching"}
          >
            <RefreshCw className={syncState === "fetching" ? "animate-spin" : ""} />
            Sinkron
          </Button>
          <Button size="sm" onClick={openCreate} disabled={!online}>
            <Plus />
            Baru
          </Button>
        </div>
      </div>

      {syncState === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <TriangleAlert className="size-4 shrink-0" />
          Gagal sinkron dengan perangkat.
          <Button variant="outline" size="xs" onClick={fetch} className="ml-auto">
            Muat ulang
          </Button>
        </div>
      )}

      {rules.length === 0 && !busy ? (
        <Card className="items-center justify-center py-12 text-center">
          <Zap className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Belum ada aturan automation</p>
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Buat aturan berbasis jadwal atau sensor — dieksekusi langsung di ESP8266.
          </p>
          <Button onClick={openCreate} disabled={!online}>
            <Plus />
            Buat Aturan Pertama
          </Button>
        </Card>
      ) : (
        Object.keys(RULE_TYPES).map((type) => {
          const list = byType[type];
          if (list.length === 0) return null;

          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{RULE_TYPES[type].label}</Badge>
                <span className="text-[11px] text-muted-foreground">
                  {list.length} aturan
                </span>
              </div>
              <div className="space-y-2">
                {list.map((rule) => {
                  const idx = rules.indexOf(rule);
                  return (
                    <Card key={rule.id} className="gap-0 py-0">
                      <RuleCard
                        rule={rule}
                        onEdit={() => openEdit(idx)}
                        onToggle={() => toggleRule(idx)}
                        onRemove={() => removeRule(idx)}
                        onDup={() => dupRule(idx)}
                        disabled={!online}
                      />
                    </Card>
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