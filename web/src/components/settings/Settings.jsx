import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../../store/useAppStore.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, RotateCcw, Download, RefreshCw, Wifi } from "lucide-react";
import CFG from "../../config.js";

function Row({ label, desc, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="shrink-0 font-mono text-xs text-muted-foreground">{value}</div>
    </div>
  );
}

function ModeRow({ number, auto, onToggle, disabled }) {
  const name = useAppStore((s) => s.relayNames[number - 1]);
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {name || "Relay " + number}
        </div>
        <div className="text-xs text-muted-foreground">
          {auto ? "Aturan dapat mengontrol relay ini" : "Relay dikunci — hanya kontrol manual"}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-medium" style={{ color: auto ? "hsl(var(--primary))" : "inherit" }}>
          {auto ? "Otomatis" : "Manual"}
        </span>
        <Switch checked={auto} onCheckedChange={onToggle} disabled={disabled} aria-label={"Mode relay " + number} />
      </div>
    </div>
  );
}

export default function Settings() {
  const deviceOnline = useAppStore((s) => s.deviceOnline);
  const relayNames = useAppStore((s) => s.relayNames);
  const relayModes = useAppStore((s) => s.relayModes);
  const setRelayName = useAppStore((s) => s.setRelayName);
  const setMode = useAppStore((s) => s.setMode);
  const reboot = useAppStore((s) => s.reboot);
  const time = useAppStore((s) => s.time);
  const ntpSynced = useAppStore((s) => s.ntpSynced);
  const lastUpdate = useAppStore((s) => s.lastUpdate);
  const requestConfig = useAppStore((s) => s.requestConfig);

  const online = deviceOnline;
  const [confirmReboot, setConfirmReboot] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [nameDraft, setNameDraft] = useState("");

  const startEditName = (n) => {
    setEditingName(n);
    setNameDraft(relayNames[n - 1] || "Relay " + n);
  };

  const saveName = () => {
    if (!editingName) return;
    const val = nameDraft.trim();
    if (!val) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    const ok = setRelayName(editingName, val);
    if (!ok) return;
    setEditingName(null);
    toast.success("Nama relay diperbarui");
  };

  const downloadConfig = () => {
    const cfg = {
      deviceId: CFG.deviceId,
      brokerUrl: CFG.brokerUrl,
      mqttUsername: CFG.mqttUsername,
      topics: {
        status: CFG.topicStatus,
        sensor: CFG.topicSensor,
        command: CFG.topicCommand,
        configSet: CFG.topicConfigSet,
        configGet: CFG.topicConfigGet,
        configResp: CFG.topicConfigResp,
        event: CFG.topicEvent,
      },
      relayNames,
      relayModes,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(cfg, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relay-config.json";
    a.click();
    URL.revokeObjectURL(url);

    toast.success("File konfigurasi diunduh");
  };

  const lastUpdateLabel = lastUpdate
    ? new Date(lastUpdate).toLocaleString("id-ID")
    : "—";

  return (
    <div className="space-y-4">
      <Card className="gap-0 py-0">
        <div className="px-3.5 pt-3.5">
          <h2 className="text-sm font-semibold">Mode Per-Relay</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Mode <b className="text-foreground">Otomatis</b> memberi aturan kebebasan
            mengontrol relay. Mode <b className="text-foreground">Manual</b> mengunci
            relay hanya untuk kontrol langsung.
          </p>
        </div>
        <div className="px-3.5 pb-1">
          {Array.from({ length: 4 }, (_, i) => (
            <ModeRow
              key={i + 1}
              number={i + 1}
              auto={relayModes[i]}
              onToggle={(auto) => setMode(i + 1, auto)}
              disabled={!online}
            />
          ))}
        </div>
      </Card>

      <Card className="gap-0 py-0">
        <div className="px-3.5 pt-3.5">
          <h2 className="text-sm font-semibold">Nama Relay</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Label yang tampil di dashboard, log, dan aturan. Tersimpan di perangkat.
          </p>
        </div>
        <div className="px-3.5 pb-1">
          {relayNames.map((name, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
              {editingName === i + 1 ? (
                <div className="flex w-full items-center gap-2">
                  <Input
                    className="h-8"
                    value={nameDraft}
                    maxLength={28}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                  />
                  <Button size="sm" onClick={saveName} disabled={!online}>
                    Simpan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(null)}>
                    Batal
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Relay {i + 1}</div>
                    <div className="truncate text-xs text-muted-foreground">{name || "—"}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditName(i + 1)}
                    disabled={!online}
                  >
                    <Pencil />
                    Ubah
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="gap-0 py-0">
        <div className="px-3.5 pt-3.5">
          <h2 className="text-sm font-semibold">Perangkat</h2>
        </div>
        <div className="px-3.5 pb-1">
          <Row label="Device ID" desc="Identitas perangkat di MQTT" value={CFG.deviceId} />
          <div className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium">Waktu internal</div>
              <div className="text-xs text-muted-foreground">Sumber untuk aturan jadwal</div>
            </div>
            <span className="shrink-0 font-mono text-xs" style={{ color: ntpSynced ? "#059669" : "#ea580c" }}>
              {time || "—"} · {ntpSynced ? "NTP OK" : "belum sinkron"}
            </span>
          </div>
          <Row label="Update terakhir" desc="Status terakhir dari perangkat" value={lastUpdateLabel} />
        </div>
        <div className="flex items-center gap-1.5 border-t bg-muted/40 px-3.5 py-2.5">
          <span className="text-[11px] text-muted-foreground">Aksi:</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={requestConfig}
            disabled={!online}
            title="Minta config ulang"
            aria-label="Minta config ulang"
          >
            <RefreshCw />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={downloadConfig}
            title="Unduh config JSON"
            aria-label="Unduh config JSON"
          >
            <Download />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirmReboot(true)}
            disabled={!online}
            title="Reboot perangkat"
            aria-label="Reboot perangkat"
            className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <RotateCcw />
          </Button>
        </div>
      </Card>

      <Card className="gap-0 py-0">
        <div className="px-3.5 py-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wifi className="size-3.5" />
            Broker: {CFG.brokerUrl.replace("wss://", "").split("/")[0]} · {CFG.deviceId}
          </div>
        </div>
      </Card>

      <AlertDialog open={confirmReboot} onOpenChange={setConfirmReboot}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reboot perangkat?</AlertDialogTitle>
            <AlertDialogDescription>
              ESP8266 akan restart. Konfigurasi &amp; aturan tersimpan aman di memori
              perangkat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const ok = reboot();
                if (ok) toast.info("Perintah reboot terkirim");
              }}
            >
              Reboot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}