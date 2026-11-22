import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle2, Eye, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useWebSocketSubscription } from '../../shared/realtime/useWebSocketSubscription';
import type { AlertItem, MachineStatusValue } from '../alerts/alertService';
import { alertService } from '../alerts/alertService';
import { ResolveAlertModal } from '../alerts/ResolveAlertModal';

function playAlertPing() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const loadUnresolvedAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await alertService.getAlerts();
      const unresolved = data.filter((item) => item.status !== 'RESOLVED');
      setAlerts(unresolved);
    } catch (err) {
      console.error('Không tải được cảnh báo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnresolvedAlerts();
  }, [loadUnresolvedAlerts]);

  const wsState = useWebSocketSubscription<AlertItem>('/topic/alerts', (incomingAlert) => {
    if (!incomingAlert?.id) return;

    if (incomingAlert.status === 'RESOLVED') {
      setAlerts((prev) => prev.filter((a) => a.id !== incomingAlert.id));
      toast.success(`Cảnh báo #${incomingAlert.id} (Máy #${incomingAlert.machineId}) đã được đóng.`);
      return;
    }

    setAlerts((prev) => {
      const exists = prev.some((a) => a.id === incomingAlert.id);
      if (exists) {
        return prev.map((a) => (a.id === incomingAlert.id ? incomingAlert : a));
      }
      return [incomingAlert, ...prev];
    });

    if (incomingAlert.status === 'ACTIVE') {
      playAlertPing();
      toast.error(`Cảnh báo ${incomingAlert.severity}: Máy #${incomingAlert.machineId} - ${incomingAlert.message}`, {
        duration: 6000,
      });
    } else if (incomingAlert.status === 'ACKNOWLEDGED') {
      toast.info(`Cảnh báo #${incomingAlert.id} đã được tiếp nhận xử lý.`);
    }
  });

  const unresolvedCount = alerts.length;

  const handleAcknowledge = async (alertId: number) => {
    try {
      setAcknowledgingId(alertId);
      const updated = await alertService.acknowledgeAlert(alertId);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      toast.success(`Đã tiếp nhận cảnh báo #${alertId}.`);
    } catch (err) {
      console.error('Không thể tiếp nhận cảnh báo:', err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleResolved = (
    resolvedAlert: AlertItem,
    updatedMachineStatus?: MachineStatusValue
  ) => {
    setAlerts((prev) => prev.filter((a) => a.id !== resolvedAlert.id));
    if (updatedMachineStatus) {
      toast.success(
        `Đã đóng cảnh báo #${resolvedAlert.id} và chuyển Máy #${resolvedAlert.machineId} sang ${updatedMachineStatus}.`
      );
    } else {
      toast.success(`Đã đóng cảnh báo #${resolvedAlert.id} thành công!`);
    }
  };

  return (
    <div className="relative">
      <Toaster position="top-right" richColors />

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        title="Trung tâm cảnh báo"
      >
        <Bell className="w-6 h-6" />
        {unresolvedCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {unresolvedCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-40 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center gap-2">
            <div>
              <span className="font-semibold text-sm text-gray-800 block">
                Cảnh báo chưa xử lý ({unresolvedCount})
              </span>
              <span className="text-[11px] flex items-center gap-1 text-gray-500">
                {wsState.isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-600" /> WebSocket /topic/alerts đã kết nối
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-500" /> Mất kết nối WS ({wsState.status})
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!wsState.isConnected && (
                <button
                  onClick={wsState.reconnect}
                  className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
                >
                  Kết nối lại
                </button>
              )}
              <button
                onClick={() => void loadUnresolvedAlerts()}
                title="Làm mới danh sách cảnh báo"
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Đang tải danh sách cảnh báo...
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Không có cảnh báo nào chưa xử lý.
              </div>
            ) : (
              alerts.map((item) => (
                <div key={item.id} className="p-3.5 hover:bg-gray-50 text-left">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          item.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          item.status === 'ACTIVE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {item.status === 'ACTIVE' ? 'Chưa tiếp nhận' : 'Đang xử lý'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">Máy #{item.machineId}</span>
                  </div>

                  <p className="text-sm text-gray-800 font-medium my-1">{item.message}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </p>

                  <div className="flex justify-end items-center gap-3 mt-2">
                    {item.status === 'ACTIVE' && (
                      <button
                        onClick={() => void handleAcknowledge(item.id)}
                        disabled={acknowledgingId === item.id}
                        className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {acknowledgingId === item.id ? 'Đang nhận...' : 'Tiếp nhận'}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedAlert(item);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đóng sự cố
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