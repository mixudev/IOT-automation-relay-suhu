import { toast } from "sonner";
import { useAppStore } from "../store/useAppStore.js";
import { useRulesStore } from "../store/useRulesStore.js";
import { onMqttMessage, onConnChange } from "./client.js";
import CFG from "../config.js";

// =====================================================
// ROUTER: message MQTT -> store global
// =====================================================

export function startRouting() {

  // Koneksi MQTT berubah -> perbarui status UI
  onConnChange((online) => {
    const app = useAppStore.getState();
    app.setConn(online ? "online" : "offline");

    if (online) {
      // Minta config saat pertama konek (sinkron sumber kebenaran)
      useRulesStore.getState().fetch();
      app.requestConfig();
    }
  });

  onMqttMessage((topic, data) => {

    const app = useAppStore.getState();
    const rules = useRulesStore.getState();

    // ---- STATIC STATUS ----
    if (topic === CFG.topicStatus) {

      app.applyStatus(data);

      if (data.ntpSynced === false) {
        app.setNtpWarning(true);
      } else if (data.ntpSynced === true) {
        app.setNtpWarning(false);
      }
    }

    // ---- SENSOR ONLY ----
    else if (topic === CFG.topicSensor) {

      if (
        typeof data.temperature === "number" &&
        typeof data.humidity === "number"
      ) {
        app.applySensor(data.temperature, data.humidity);
      }
    }

    // ---- CONFIG RESP (ack / get) ----
    else if (topic === CFG.topicConfigResp) {

      if (data.ok === true || Array.isArray(data.rules)) {

        rules.applyConfig(data);

        if (rules.pendingAction === "save") {

          toast.success("Aturan tersimpan di perangkat");
        }

        rules.setPendingAction(null);

      } else {

        toast.error(
          data.error
            ? "Gagal simpan: " + data.error
            : "Gagal sinkronkan konfigurasi"
        );

        rules.setPendingAction(null);
      }
    }

    // ---- EVENT (feed aktivitas) ----
    else if (topic === CFG.topicEvent) {

      const ts = new Date();
      const ev = {
        ts: ts.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        tsFull: ts.toISOString(),
        relay: data.relay,
        state: data.state,
        source: data.source,
        ruleName: data.ruleName,
        reason: data.reason,
      };

      app.pushEvent(ev);
    }
  });
}