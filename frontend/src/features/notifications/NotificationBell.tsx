import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useWebSocketSubscription } from '../../shared/realtime/useWebSocketSubscription';
import type { AlertItem } from '../alerts/alertService';
import { alertService } from '../alerts/alertService';
import { ResolveAlertModal } from '../alerts/ResolveAlertModal';

function playAlertPing() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn('Trình duyệt chặn phát âm thanh tự động:', e);
  }
}

export const NotificationBell: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  useEffect(() => {
    alertService
      .getAlerts({ status: 'ACTIVE' })
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Không tải được cảnh báo:', err));
  }, []);

  useWebSocketSubscription<AlertItem>('/topic/alerts', (newAlert) => {
    playAlertPing();
    setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);

    toast.error(
      `Cảnh báo: Máy #${newAlert.machineId} - ${newAlert.message}`,
      { duration: 6000 }
    );
  });

  const activeCount = alerts.filter((a) => a.status !== 'RESOLVED').length;

  const handleResolved = (resolvedId: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== resolvedId));
    toast.success('Đã xác nhận xử lý sự cố thành công!');
  };

  return (
    <div className="relative">
      <Toaster position="top-right" richColors />

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {activeCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-40 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <span className="font-semibold text-sm text-gray-800">
              Trung tâm cảnh báo ({activeCount})
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Không có cảnh báo sự cố nào chưa xử lý.
              </div>
            ) : (
              alerts.map((item) => (
                <div key={item.id} className="p-3.5 hover:bg-gray-50 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        item.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-xs text-gray-400">
                      Máy #{item.machineId}
                    </span>
                  </div>

                  <p className="text-sm text-gray-800 font-medium my-1">
                    {item.message}
                  </p>

                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        setSelectedAlert(item);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Xác nhận đã xử lý
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ResolveAlertModal
        alertItem={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onSuccess={handleResolved}
      />
    </div>
  );
};
