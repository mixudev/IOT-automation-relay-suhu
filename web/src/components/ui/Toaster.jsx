import { useToastStore } from "../../store/useToastStore.js";

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="toaster">
      {toasts.map((t) => (
        <div key={t.id} className={"toast " + t.type}>
          {t.message}
        </div>
      ))}
    </div>
  );
}