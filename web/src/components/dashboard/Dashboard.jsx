import { useAppStore } from "../../store/useAppStore.js";
import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, Droplets, Power, Activity } from "lucide-react";
import RelayCard from "./RelayCard.jsx";
import { fmtTemp, fmtHum } from "../../utils/format.js";
import { RELAY_COUNT } from "../../config.js";

function StatCard({ label, value, unit, icon: Icon, valueClass, chipClass }) {
  return (
    <Card className="gap-0 py-3.5">
      <CardContent className="flex flex-col gap-1 px-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
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
          <span className="text-[11px] text-muted-foreground">{unit}</span>
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

  const online = deviceOnline;
  const relayOn = relayStates.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Suhu"
          value={fmtTemp(temperature)}
          unit="°C"
          icon={Thermometer}
          valueClass="text-orange-600"
          chipClass="bg-orange-100 text-orange-600"
        />
        <StatCard
          label="Kelembapan"
          value={fmtHum(humidity)}
          unit="%RH"
          icon={Droplets}
          valueClass="text-teal-600"
          chipClass="bg-teal-100 text-teal-600"
        />
        <StatCard
          label="Relay Nyala"
          value={relayOn}
          unit={"dari " + RELAY_COUNT}
          icon={Power}
          valueClass="text-emerald-600"
          chipClass="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          label="Aturan Aktif"
          value={rulesActive}
          unit="rules"
          icon={Activity}
          valueClass="text-primary"
          chipClass="bg-indigo-100 text-indigo-600"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Relay</h2>
          {!online && (
            <span className="text-[11px] font-medium text-red-600">
              Perangkat tidak terhubung
            </span>
          )}
        </div>
        <div className="grid gap-2.5">
          {Array.from({ length: RELAY_COUNT }, (_, i) => (
            <RelayCard key={i + 1} number={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}