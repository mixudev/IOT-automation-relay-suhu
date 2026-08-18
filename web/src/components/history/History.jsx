import { useState } from "react";
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
import EventFeed from "../dashboard/EventFeed.jsx";
import EmptyState from "../ui/EmptyState.jsx";

export default function History() {
  const tempHistory = useAppStore((s) => s.tempHistory);
  const humHistory = useAppStore((s) => s.humHistory);
  const [metric, setMetric] = useState("temp");

  const data = [];
  const n = Math.max(tempHistory.length, humHistory.length);
  const t0 = tempHistory.length ? tempHistory.length - n : 0;
  const h0 = humHistory.length ? humHistory.length - n : 0;

  for (let i = 0; i < Math.min(n, 120); i++) {
    const idxT = t0 + i;
    const idxH = h0 + i;
    data.push({
      t: i + 1,
      temp:
        tempHistory[idxT] !== undefined ? +tempHistory[idxT].toFixed(1) : null,
      hum: humHistory[idxH] !== undefined ? Math.round(humHistory[idxH]) : null,
    });
  }

  const tempSeries =
    tempHistory.length > 1
      ? tempHistory
      : null;

  const minTemp = tempHistory.length ? Math.min(...tempHistory) : 0;
  const maxTemp = tempHistory.length ? Math.max(...tempHistory) : 0;
  const avgTemp = tempHistory.length
    ? tempHistory.reduce((s, v) => s + v, 0) / tempHistory.length
    : 0;

  const stats = [
    { label: "Terendah", value: minTemp.toFixed(1) + "°C", accent: "var(--teal)" },
    { label: "Rata-rata", value: avgTemp.toFixed(1) + "°C", accent: "var(--accent)" },
    { label: "Tertinggi", value: maxTemp.toFixed(1) + "°C", accent: "var(--orange)" },
  ];

  return (
    <div>
      {tempSeries ? (
        <div className="grid-2">
          {stats.map((s) => (
            <div className="card sensor-card" key={s.label}>
              <div className="eyebrow">{s.label}</div>
              <div className="sensor-value" style={{ color: s.accent }}>
                {s.value}
              </div>
              <div className="sensor-label">dari {tempHistory.length} sampel</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="section-gap">
        <div className="toolbar">
          <div className="seg" style={{ width: 260 }}>
            <button
              className={metric === "temp" ? "active" : ""}
              onClick={() => setMetric("temp")}
            >
              Suhu
            </button>
            <button
              className={metric === "hum" ? "active" : ""}
              onClick={() => setMetric("hum")}
            >
              Kelembapan
            </button>
          </div>
          <span className="stat-em">Data sesi ini (maks 120 titik)</span>
        </div>

        <div className="card">
          {data.length > 1 ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Sampel", position: "insideBottom", offset: -4, fill: "var(--muted)", fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => (metric === "temp" ? v + "°" : v + "%")}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--text)",
                    }}
                    formatter={(v) =>
                      metric === "temp" ? [v.toFixed(1) + " °C", "Suhu"] : [v + " %", "Kelembapan"]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {metric === "temp" ? (
                    <Line
                      type="monotone"
                      dataKey="temp"
                      name="Suhu"
                      stroke="var(--orange)"
                      strokeWidth={2.4}
                      dot={false}
                      activeDot={{ r: 3 }}
                      connectNulls
                    />
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="hum"
                      name="Kelembapan"
                      stroke="var(--teal)"
                      strokeWidth={2.4}
                      dot={false}
                      activeDot={{ r: 3 }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon="◌"
              title="Belum ada data sensor yang cukup"
              text="Grafik suhu & kelembapan akan tampil setelah beberapa sampel terkumpul."
            />
          )}
        </div>
      </div>

      <div className="section-gap">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Log Aktivitas</div>
          </div>
        </div>
        <div className="card">
          <EventFeed limit={40} />
        </div>
      </div>
    </div>
  );
}