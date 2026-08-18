import { useAppStore } from "../../store/useAppStore.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Power, Zap, SlidersHorizontal } from "lucide-react";

export default function RelayCard({ number }) {
  const name = useAppStore((s) => s.relayNames[number - 1]);
  const on = useAppStore((s) => s.relayStates[number - 1]);
  const auto = useAppStore((s) => s.relayModes[number - 1]);
  const conn = useAppStore((s) => s.conn);
  const manualRelay = useAppStore((s) => s.manualRelay);
  const setMode = useAppStore((s) => s.setMode);

  const online = conn === "online";

  return (
    <Card className={"gap-0 py-0" + (on ? " border-emerald-200" : "")}>
      <CardContent className="flex flex-col gap-3 px-3.5 py-3.5">
        <div className="flex items-center justify-between gap-2">
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
              <p className="truncate text-sm font-semibold leading-tight">
                {name || "Relay " + number}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Relay {number}
              </p>
            </div>
          </div>
          <Badge
            variant={on ? "default" : "secondary"}
            className={on ? "bg-gradient-to-r from-emerald-500 to-teal-600" : ""}
          >
            {on ? "ON" : "OFF"}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            {auto ? "Mode otomatis" : "Mode manual"}
          </div>
          <Button
            size="sm"
            variant={auto ? "default" : "outline"}
            onClick={() => setMode(number, !auto)}
            disabled={!online}
          >
            <Zap className={auto ? "" : "text-muted-foreground"} />
            {auto ? "Otomatis" : "Manual"}
          </Button>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium">{on ? "Menyala" : "Mati"}</span>
          <Switch
            checked={on}
            onCheckedChange={(v) => manualRelay(number, v)}
            disabled={!online}
            aria-label={"Relay " + number + (on ? " mati" : " nyala")}
          />
        </div>
      </CardContent>
    </Card>
  );
}