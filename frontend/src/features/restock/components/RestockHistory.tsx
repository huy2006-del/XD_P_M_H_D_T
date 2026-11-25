import { useRestockHistory } from "../hooks/useRestockHistory";
import { RESTOCK_STATUS_LABELS } from "../types";

const timeFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : timeFormat.format(date);
}

export function RestockHistory({ machineId }: { machineId: number }) {
  const { sessions, loading, error, refresh } = useRestockHistory(machineId);

  return (
    <section className="mt-6 rounded-xl border bg-white p-4" aria-label="Lịch sử nạp hàng">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Lịch sử nạp hàng</h2>
        <button type="button" className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={loading} onClick={() => void refresh()}>
          Làm mới
        </button>
      </div>
      {loading && <p role="status" className="mt-3 text-sm">Đang tải lịch sử…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {!loading && !error && sessions.length === 0 && (
        <p className="mt-3 text-sm text-gray-600">Chưa có phiên nạp nào.</p>
      )}
      <div className="mt-3 space-y-3">
        {sessions.map((session) => (
          <details key={session.id} className="rounded-lg border p-3">
            <summary className="cursor-pointer font-medium">
              {session.sessionCode} · {RESTOCK_STATUS_LABELS[session.status]}
            </summary>
            <dl className="mt-2 space-y-1 break-words text-sm text-gray-700">
              <div><dt className="inline font-medium">Người thao tác </dt><dd className="inline">{session.operatorId}</dd></div>
              <div><dt className="inline font-medium">Bắt đầu </dt><dd className="inline">{formatTime(session.startedAt)}</dd></div>
              {session.completedAt && (
                <div><dt className="inline font-medium">Hoàn tất </dt><dd className="inline">{formatTime(session.completedAt)}</dd></div>
              )}
            </dl>
            {session.items?.length > 0 && (
              <ul className="mt-2 space-y-1 border-t pt-2 text-sm">
                {session.items.map((item) => (
                  <li key={item.id}>
                    Khay {item.slotCode} · {item.productName} · Lô {item.batchCode} · {item.quantityAdded} sản phẩm
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
