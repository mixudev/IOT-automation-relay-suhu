import { useAppStore } from "../../store/useAppStore.js";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Power } from "lucide-react";

export default function RelayCard({ number }) {
  const name = useAppStore((s) => s.relayNames[number - 1]);
  const on = useAppStore((s) => s.relayStates[number - 1]);
  const auto = useAppStore((s) => s.relayModes[number - 1]);
  const deviceOnline = useAppStore((s) => s.deviceOnline);
  const manualRelay = useAppStore((s) => s.manualRelay);
  const setMode = useAppStore((s) => s.setMode);

  const online = deviceOnline;

  return (
    <Card className={"gap-0 py-0" + (on ? " border-emerald-200" : "")}>
      <CardContent className="px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={
                "grid size-9 shrink-0 place-items-center rounded-lg " +
                (on
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                  : "bg-muted text-muted-foreground")
              }
            >
              <Power className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">
                {name || "Relay " + number}
              </p>
              <p className="text-xs text-muted-foreground">
                {auto ? "Otomatis" : "Manual"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => online && setMode(number, !auto)}
              disabled={!online}
              className={
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
                (auto
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-muted bg-muted/50 text-muted-foreground")
              }
              aria-pressed={auto}
              title={auto ? "Ubah ke Manual" : "Ubah ke Otomatis"}
            >
              {auto ? "Otomatis" : "Manual"}
            </button>
            <Switch
              checked={on}
              onCheckedChange={(v) => manualRelay(number, v)}
              disabled={!online}
              aria-label={"Relay " + number + " " + name + (on ? " mati" : " nyala")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}