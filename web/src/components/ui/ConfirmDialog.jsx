import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Hapus",
  danger = true,
  busy,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel || onConfirm}>
      <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{message}</p>
      <div className="editor-actions">
        <button className="btn" onClick={onCancel} disabled={busy}>
          Batal
        </button>
        <button
          className={"btn " + (danger ? "btn-danger" : "btn-primary")}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Menyimpan…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}