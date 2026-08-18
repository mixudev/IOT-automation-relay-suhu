import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Home, Zap, History, Settings, Power, TriangleAlert, WifiOff } from "lucide-react";
import { useAppStore } from "./store/useAppStore.js";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import Automation from "./components/automation/Automation.jsx";
import HistoryPage from "./components/history/History.jsx";
import SettingsPage from "./components/settings/Settings.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "automation", label: "Automation", icon: Zap },
  { id: "history", label: "Riwayat", icon: History },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

const STATUS = {
  online: {
    label: "Online",
    title: "Perangkat terhubung",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  "device-offline": {
    label: "Perangkat offline",
    title: "Perangkat tidak merespons",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  offline: {
    label: "Offline",
    title: "Terputus dari broker",
    cls: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  connecting: {
    label: "…",
    title: "Menghubungkan…",
    cls: "border-border bg-muted text-muted-foreground",
    dot: "bg-amber-400",
  },
};

export default function App() {
  const [page, setPage] = useState("dashboard");

  const conn = useAppStore((s) => s.conn);
  const deviceOnline = useAppStore((s) => s.deviceOnline);
  const time = useAppStore((s) => s.time);
  const ntpSynced = useAppStore((s) => s.ntpSynced);
  const ntpWarning = useAppStore((s) => s.ntpWarning);

  const status =
    conn === "online"
      ? deviceOnline
        ? "online"
        : "device-offline"
      : conn === "offline"
        ? "offline"
        : "connecting";

  const st = STATUS[status];

  const offlineReason =
    status === "device-offline"
      ? "Perangkat tidak merespons — semua fitur dinonaktifkan sampai perangkat kembali online."
      : status === "offline"
        ? "Tidak terhubung ke broker MQTT — semua fitur dinonaktifkan."
        : "";

  const renderPage = () => {
    switch (page) {
      case "automation":
        return <Automation />;
      case "history":
        return <HistoryPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-48 bg-[radial-gradient(70%_100%_at_50%_0%,oklch(0.92_0.045_277),transparent_72%)]"
      />
      <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b bg-background/85 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Power className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Relay Control</p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              ESP8266 · v2.0.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "online" && (
            <span className="rounded-full border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {time || "--:--"}
            </span>
          )}
          <span
            title={st.title}
            className={
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium " +
              st.cls
            }
          >
            <span className={"size-1.5 rounded-full " + st.dot} />
            {st.label}
          </span>
        </div>
      </header>

      <main className="relative flex-1 px-3.5 pb-24 pt-4">
        {offlineReason && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
            <WifiOff className="size-4 shrink-0" />
            {offlineReason}
          </div>
        )}

        {ntpWarning && !ntpSynced && status === "online" && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <TriangleAlert className="size-4 shrink-0" />
            Waktu belum sinkron (NTP). Aturan jadwal aktif setelah waktu tersinkron.
          </div>
        )}

        <div className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight">
            {NAV.find((n) => n.id === page)?.label}
          </h1>
          <p className="text-xs text-muted-foreground">
            Kontrol relay &amp; automation
          </p>
        </div>

        {renderPage()}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[560px] border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors " +
                (active ? "text-primary" : "text-muted-foreground")
              }
            >
              <span
                className={
                  "grid size-7 place-items-center rounded-lg transition-colors " +
                  (active ? "bg-primary/15" : "")
                }
              >
                <Icon className="size-5" />
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}