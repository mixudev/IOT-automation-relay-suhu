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
  const tempHistory = useAppStore((s) => s.tempHistory);
  const humHistory = useAppStore((s) => s.humHistory);
  const [metric, setMetric] = useState("temp");

  const data = useMemo(() => {
    const n = Math.max(tempHistory.length, humHistory.length);
    const t0 = tempHistory.length ? tempHistory.length - n : 0;
    const h0 = humHistory.length ? humHistory.length - n : 0;
    const arr = [];
    for (let i = 0; i < Math.min(n, 120); i++) {
      const idxT = t0 + i;
      const idxH = h0 + i;
      arr.push({
        t: i + 1,
        temp:
          tempHistory[idxT] !== undefined ? +tempHistory[idxT].toFixed(1) : null,
        hum: humHistory[idxH] !== undefined ? Math.round(humHistory[idxH]) : null,
      });
    }
    return arr;
  }, [tempHistory, humHistory]);

  const stats = useMemo(() => {
    if (tempHistory.length === 0) return null;
    const min = Math.min(...tempHistory);
    const max = Math.max(...tempHistory);
    const avg = tempHistory.reduce((s, v) => s + v, 0) / tempHistory.length;
    return [
      {
        label: "Terendah",
        value: min.toFixed(1) + "°C",
        accent: "#0d9488",
      },
      {
        label: "Rata-rata",
        value: avg.toFixed(1) + "°C",
        accent: "hsl(var(--primary))",
      },
      {
        label: "Tertinggi",
        value: max.toFixed(1) + "°C",
        accent: "#ea580c",
      },
    ];
  }, [tempHistory]);

  const hasChart = data.length > 1;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} icon={Thermometer} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Tabs value={metric} onValueChange={setMetric} className="gap-2">
          <div className="flex items-center justify-between gap-2">
            <TabsList className="w-fit">
              <TabsTrigger value="temp">
                <Thermometer />
                Suhu
              </TabsTrigger>
              <TabsTrigger value="hum">
                <Droplets />
                Kelembapan
              </TabsTrigger>
            </TabsList>
            <span className="text-[11px] text-muted-foreground">
              Data sesi ini (maks 120 titik)
            </span>
          </div>

          <TabsContent value="temp">
            <Card className="gap-0 px-0 py-0">
              {hasChart ? (
                <div className="h-64 w-full px-1 py-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                      <XAxis
                        dataKey="t"
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                        label={{
                          value: "Sampel",
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
                        tickFormatter={(v) => v + "°"}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v.toFixed(1) + " °C", "Suhu"]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="temp"
                        name="Suhu"
                        stroke="#ea580c"
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
                    Grafik suhu akan tampil setelah beberapa sampel terkumpul.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="hum">
            <Card className="gap-0 px-0 py-0">
              {hasChart ? (
                <div className="h-64 w-full px-1 py-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                      <XAxis
                        dataKey="t"
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                        label={{
                          value: "Sampel",
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
                        tickFormatter={(v) => v + "%"}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v + " %", "Kelembapan"]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="hum"
                        name="Kelembapan"
                        stroke="#0d9488"
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
                    Grafik kelembapan akan tampil setelah beberapa sampel terkumpul.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Log Aktivitas</h2>
        </div>
        <Card className="gap-0 py-0">
          <EventFeed limit={40} />
        </Card>
      </div>
    </div>
  );
}