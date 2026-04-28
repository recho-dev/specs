import VersionTimeline from "../versions/VersionTimeline";

export default function VersionsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="overflow-hidden bg-white rounded-2xl"
        style={{ width: 720, maxWidth: "calc(100% - 24px)", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <div className="text-sm font-semibold text-zinc-900">Versions</div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 text-lg leading-none">
            ×
          </button>
        </div>
        <div className="p-2">
          <VersionTimeline defaultOpen hideHeader />
        </div>
      </div>
    </div>
  );
}

