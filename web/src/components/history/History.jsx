import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAppStore } from "../../store/useAppStore.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Activity, Thermometer, Droplets } from "lucide-react";
import EventFeed from "../dashboard/EventFeed.jsx";

const METRICS = {
  temp: {
    label: "Suhu",
    unit: "°",
    suffix: " °C",
    line: "#ea580c",
    icon: Thermometer,
    accentMin: "#0d9488",
    accentAvg: "hsl(var(--primary))",
    accentMax: "#ea580c",
  },
  hum: {
    label: "Kelembapan",
    unit: "%",
    suffix: " %",
    line: "#0d9488",
    icon: Droplets,
    accentMin: "#0d9488",
    accentAvg: "hsl(var(--primary))",
    accentMax: "#ea580c",
  },
};

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <Card className="gap-0 py-3">
      <div className="flex flex-col gap-1 px-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <Icon className="size-3.5 text-muted-foreground/50" />
        </div>
        <span className="font-mono text-xl font-semibold tracking-tight" style={{ color: accent }}>
          {value}
        </span>
      </div>
    </Card>
  );
}

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};

export default function History() {
  const history = useAppStore((s) => s.history);
  const [metric, setMetric] = useState("temp");
  const m = METRICS[metric];

  const data = useMemo(
    () =>
      history.map((p) => ({
        label: new Date(p.ts).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        temp: +p.temp.toFixed(1),
        hum: Math.round(p.hum),
      })),
    [history]
  );

  const stats = useMemo(() => {
    const series =
      metric === "temp"
        ? data.map((d) => d.temp).filter((v) => v !== null)
        : data.map((d) => d.hum).filter((v) => v !== null);
    if (series.length === 0) return null;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const avg = series.reduce((s, v) => s + v, 0) / series.length;
    return [
      { label: "Terendah", value: min.toFixed(1) + m.unit, accent: m.accentMin },
      { label: "Rata-rata", value: avg.toFixed(1) + m.unit, accent: m.accentAvg },
      { label: "Tertinggi", value: max.toFixed(1) + m.unit, accent: m.accentMax },
    ];
  }, [data, metric, m]);

  const hasChart = data.length > 1;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} icon={m.icon} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Tabs value={metric} onValueChange={setMetric}>
            <TabsList>
              <TabsTrigger value="temp">
                <Thermometer />
                Suhu
              </TabsTrigger>
              <TabsTrigger value="hum">
                <Droplets />
                Kelembapan
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="text-[11px] text-muted-foreground">
            Rata-rata per jam · ~5 hari
          </span>
        </div>

        <Card className="gap-0 px-0 py-0">
          {hasChart ? (
            <div className="h-64 w-full px-1 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={48}
                    label={{
                      value: "Jam",
                      position: "insideBottom",
                      offset: -4,
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => v + m.unit}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => [v.toFixed(1) + m.suffix, m.label]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    name={m.label}
                    stroke={m.line}
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
              <Activity className="size-7 text-muted-foreground/40" />
              <p className="text-sm font-medium">Belum ada data sensor yang cukup</p>
              <p className="text-xs text-muted-foreground">
                Grafik naik/turun akan terlihat setelah beberapa jam data terkumpul
                (1 titik per jam).
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Log Aktivitas</h2>
        <Card className="gap-0 py-0">
          <EventFeed limit={40} />
        </Card>
      </div>
    </div>
  );
}