import { useAppStore } from "../../store/useAppStore.js";
import { useRulesStore } from "../../store/useRulesStore.js";
import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, Droplets } from "lucide-react";
import RelayCard from "./RelayCard.jsx";
import EventFeed from "./EventFeed.jsx";
import { fmtTemp, fmtHum } from "../../utils/format.js";
import { RELAY_COUNT } from "../../config.js";

function SensorCard({ label, value, unit, icon: Icon, valueClass, chipClass }) {
  return (
    <Card className="gap-0 py-3.5">
      <CardContent className="flex flex-col gap-1 px-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className={"grid size-6 shrink-0 place-items-center rounded-md " + chipClass}>
            <Icon className="size-3.5" />
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={"font-mono text-2xl font-semibold tracking-tight " + valueClass}>
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const temperature = useAppStore((s) => s.temperature);
  const humidity = useAppStore((s) => s.humidity);
  const deviceOnline = useAppStore((s) => s.deviceOnline);
  const relayStates = useAppStore((s) => s.relayStates);
  const rulesActive = useAppStore((s) => s.rulesActive);
  const rulesTotal = useRulesStore((s) => s.rules.length);

  const online = deviceOnline;
  const relayOn = relayStates.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <SensorCard
          label="Suhu"
          value={fmtTemp(temperature) + "°"}
          unit="C"
          icon={Thermometer}
          valueClass="text-orange-600"
          chipClass="bg-orange-100 text-orange-600"
        />
        <SensorCard
          label="Kelembapan"
          value={fmtHum(humidity) + "%"}
          unit="RH"
          icon={Droplets}
          valueClass="text-teal-600"
          chipClass="bg-teal-100 text-teal-600"
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {relayOn} dari {RELAY_COUNT} relay aktif
        {typeof rulesTotal === "number" && rulesTotal > 0
          ? " · " + rulesActive + " aturan berjalan"
          : ""}
      </p>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Relay</h2>
          {!online && (
            <span className="text-xs font-medium text-red-600">
              Perangkat tidak terhubung
            </span>
          )}
        </div>
        <div className="grid gap-2">
          {Array.from({ length: RELAY_COUNT }, (_, i) => (
            <RelayCard key={i + 1} number={i + 1} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Aktivitas</h2>
        </div>
        <Card className="gap-0 py-0">
          <EventFeed limit={6} />
        </Card>
      </div>
    </div>
  );
}