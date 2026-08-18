import { useState } from "react";
import { useAppStore } from "./store/useAppStore.js";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import Automation from "./components/automation/Automation.jsx";
import History from "./components/history/History.jsx";
import Settings from "./components/settings/Settings.jsx";
import Toaster from "./components/ui/Toaster.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "automation", label: "Automation", icon: "bolt" },
  { id: "history", label: "Riwayat", icon: "chart" },
  { id: "settings", label: "Pengaturan", icon: "gear" },
];

const ICONS = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.06a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.06a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87.9.9 0 0 0 .77.5H21a2 2 0 1 1 0 4h-.09a.9.9 0 0 0-.51.05z" />
    </>
  ),
};

export default function App() {
  const [page, setPage] = useState("dashboard");

  const conn = useAppStore((s) => s.conn);
  const time = useAppStore((s) => s.time);
  const ntpSynced = useAppStore((s) => s.ntpSynced);
  const ntpWarning = useAppStore((s) => s.ntpWarning);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", next === "dark" ? "#14161C" : "#F2F3F5");
    }
  };

  const connLabel =
    conn === "online" ? "Online" : conn === "offline" ? "Offline" : "…";
  const connTitle =
    conn === "online"
      ? "Terhubung"
      : conn === "offline"
        ? "Terputus"
        : "Menghubungkan…";

  const renderPage = () => {
    switch (page) {
      case "automation":
        return <Automation />;
      case "history":
        return <History />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand">
          <div className="logo">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <circle cx="7" cy="17" r="2.2" fill="#fff" />
              <circle cx="17" cy="7" r="2.2" fill="#fff" fillOpacity="0.9" />
              <path d="M8.6 15.4 15.4 8.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="brand-name">Relay Control</div>
            <div className="brand-sub">ESP8266 · v2.0.0</div>
          </div>
        </div>

        <div className="appbar-right">
          {conn === "online" && (
            <span className="time-badge">{time || "--:--"}</span>
          )}
          <div className={"conn-pill " + conn} title={connTitle}>
            <span className="conn-dot"></span>
            {connLabel}
          </div>
          <button className="theme-btn" onClick={toggleTheme} aria-label="Ganti tema">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </button>
        </div>
      </header>

      <main className="main">
        {ntpWarning && !ntpSynced && (
          <div className="warn-banner">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
            Waktu belum sinkron (NTP). Aturan berbasis jadwal akan aktif setelah waktu tersinkron.
          </div>
        )}

        <div className="page-head">
          <div className="page-title">
            {NAV.find((n) => n.id === page)?.label}
          </div>
          <div className="page-desc">Kontrol relay & automation</div>
        </div>

        {renderPage()}
      </main>

      <nav className="bottom-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={"nav-item" + (page === item.id ? " active" : "")}
            onClick={() => setPage(item.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[item.icon]}
            </svg>
            {item.label}
          </button>
        ))}
      </nav>

      <Toaster />
    </div>
  );
}