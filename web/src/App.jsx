import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Home, Zap, History, Settings, Power, TriangleAlert } from "lucide-react";
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

export default function App() {
  const [page, setPage] = useState("dashboard");

  const conn = useAppStore((s) => s.conn);
  const time = useAppStore((s) => s.time);
  const ntpSynced = useAppStore((s) => s.ntpSynced);
  const ntpWarning = useAppStore((s) => s.ntpWarning);

  const connLabel =
    conn === "online" ? "Online" : conn === "offline" ? "Offline" : "…";
  const connTitle =
    conn === "online"
      ? "Terhubung"
      : conn === "offline"
        ? "Terputus"
        : "Menghubungkan…";

  const connClass =
    conn === "online"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : conn === "offline"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-border bg-muted text-muted-foreground";

  const dotClass =
    conn === "online"
      ? "bg-emerald-500"
      : conn === "offline"
        ? "bg-red-500"
        : "bg-amber-400";

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
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
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
          {conn === "online" && (
            <span className="rounded-full border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {time || "--:--"}
            </span>
          )}
          <span
            title={connTitle}
            className={
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium " +
              connClass
            }
          >
            <span className={"size-1.5 rounded-full " + dotClass} />
            {connLabel}
          </span>
        </div>
      </header>

      <main className="flex-1 px-3.5 pb-24 pt-4">
        {ntpWarning && !ntpSynced && (
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

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[560px] border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium transition-colors " +
                (active ? "text-primary" : "text-muted-foreground")
              }
            >
              <Icon className={"size-5 " + (active ? "" : "")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}