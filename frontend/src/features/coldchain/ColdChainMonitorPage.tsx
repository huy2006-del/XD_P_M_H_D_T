import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Power,
  RefreshCw,
  Snowflake,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { axiosInstance } from '../../shared/api/axiosInstance';
import { useWebSocketSubscription } from '../../shared/realtime/useWebSocketSubscription';
import {
  alertService,
  type AlertItem,
  type MachineStatusValue,
} from '../alerts/alertService';
import { ResolveAlertModal } from '../alerts/ResolveAlertModal';
import { ColdChainStatusHeader } from './components/ColdChainStatusHeader';
import { ColdChainRealtimeChart } from './components/ColdChainRealtimeChart';
import { MachineAlertsPanel } from './components/MachineAlertsPanel';
import { alarmAudio } from './utils/audioAlarm';
import type {
  ColdChainStatus,
  DataFreshnessState,
  MachineDetailDto,
  TelemetryPoint,
} from './types';

const MAX_CHART_POINTS = 40;
const STALE_THRESHOLD_MS = 30_000;
const CRITICAL_TEMP_THRESHOLD = 12.0;

function formatTime(isoString?: string | null) {
  if (!isoString) return '--:--:--';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatRelativeAge(isoString: string | null | undefined, nowMs: number) {
  if (!isoString) return 'Chưa có dữ liệu';
  const ts = new Date(isoString).getTime();
  if (Number.isNaN(ts)) return 'Không xác định';
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  const absolute = new Date(ts).toLocaleString('vi-VN');
  if (diffSec < 60) return `${absolute} (${diffSec} giây trước)`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${absolute} (${diffMin} phút trước)`;
  const diffHours = Math.floor(diffMin / 60);
  return `${absolute} (${diffHours} giờ trước)`;
}

function formatDoorLabel(machine: MachineDetailDto | null): string {
  if (!machine) return 'Chưa có dữ liệu';
  if (typeof machine.doorOpen === 'boolean') {
    return machine.doorOpen ? 'Đang mở' : 'Đã đóng';
  }
  if (machine.doorStatus) {
    if (machine.doorStatus === 'OPEN') return 'Đang mở';
    if (machine.doorStatus === 'CLOSED') return 'Đã đóng';
    return machine.doorStatus;
  }
  return 'Chưa có cảm biến từ BE';
}

export const ColdChainMonitorPage: React.FC = () => {
  const { id = '1' } = useParams();
  const machineId = Number(id) || 1;
  const navigate = useNavigate();

  const [machines, setMachines] = useState<MachineDetailDto[]>([]);
  const [machineDetail, setMachineDetail] = useState<MachineDetailDto | null>(null);
  const [dataPoints, setDataPoints] = useState<TelemetryPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [resolvingAlert, setResolvingAlert] = useState<AlertItem | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Chỉ cập nhật đồng hồ để tính trạng thái dữ liệu cũ (STALE), không tạo dữ liệu giả
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMachinesAndDetail = useCallback(async () => {
    try {
      const [listRes, detailRes] = await Promise.all([
        axiosInstance.get<MachineDetailDto[]>('/api/v1/machines'),
        axiosInstance.get<MachineDetailDto>(`/api/v1/machines/${machineId}`),
      ]);
      setMachines(Array.isArray(listRes.data) ? listRes.data : []);
      setMachineDetail(detailRes.data);
    } catch (err) {
      console.error('Không tải được thông tin máy:', err);
    }
  }, [machineId]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingTelemetry(true);
      const res = await axiosInstance.get<
        Array<{
          id?: number;
          machineId?: number;
          temperature: number;
          humidity: number;
          recordedAt: string;
        }>
      >(`/api/v1/machines/${machineId}/telemetry/history`, {
        params: { limit: 30 },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      // Backend trả DESC (mới nhất trước) -> đảo chiều về ASC để vẽ biểu đồ theo thời gian
      const formatted: TelemetryPoint[] = list
        .slice()
        .reverse()
        .map((item) => ({
          id: item.id,
          machineId: item.machineId,
          temperature: Number(item.temperature),
          humidity: Number(item.humidity),
          recordedAt: item.recordedAt,
          timeLabel: formatTime(item.recordedAt),
          source: 'HISTORY',
        }));
      setDataPoints(formatted);
    } catch (err) {
      console.error('Không tải được lịch sử telemetry:', err);
      setDataPoints([]);
    } finally {
      setLoadingTelemetry(false);
    }
  }, [machineId]);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const list = await alertService.getAlerts();
      setAlerts(list);
    } catch (err) {
      console.error('Không tải được danh sách cảnh báo:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    void fetchMachinesAndDetail();
    void fetchHistory();
    void fetchAlerts();
  }, [fetchMachinesAndDetail, fetchHistory, fetchAlerts]);

  // 1. WebSocket topic telemetry theo machineId
  const telemetryWs = useWebSocketSubscription<{
    id?: number;
    machineId?: number;
    temperature: number;
    humidity: number;
    recordedAt: string;
  }>(`/topic/telemetry/${machineId}`, (incoming) => {
    if (!incoming || typeof incoming.temperature !== 'number') return;

    const nextPoint: TelemetryPoint = {
      id: incoming.id,
      machineId: incoming.machineId ?? machineId,
      temperature: Number(incoming.temperature),
      humidity: Number(incoming.humidity),
      recordedAt: incoming.recordedAt || new Date().toISOString(),
      timeLabel: formatTime(incoming.recordedAt),
      source: 'REALTIME',
    };

    setDataPoints((prev) => {
      if (nextPoint.id && prev.some((p) => p.id === nextPoint.id)) {
        return prev;
      }
      const updated = [...prev, nextPoint];
      return updated.length > MAX_CHART_POINTS
        ? updated.slice(updated.length - MAX_CHART_POINTS)
        : updated;
    });

    setMachineDetail((prev) =>
      prev
        ? {
            ...prev,
            currentTemp: nextPoint.temperature,
            currentHumidity: nextPoint.humidity,
            lastPingAt: nextPoint.recordedAt,
          }
        : prev
    );
  });

  // 2. WebSocket topic alerts toàn hệ thống
  const alertsWs = useWebSocketSubscription<AlertItem>('/topic/alerts', (incomingAlert) => {
    if (!incomingAlert?.id) return;

    setAlerts((prev) => {
      const exists = prev.some((a) => a.id === incomingAlert.id);
      if (exists) {
        return prev.map((a) => (a.id === incomingAlert.id ? incomingAlert : a));
      }
      return [incomingAlert, ...prev];
    });

    // Khi máy hiện tại bị cảnh báo CRITICAL, BE tự đổi status sang OUT_OF_ORDER -> đồng bộ lại chi tiết máy
    if (incomingAlert.machineId === machineId && incomingAlert.severity === 'CRITICAL') {
      void fetchMachinesAndDetail();
    }
  });

  const minThreshold = Number(machineDetail?.tempMinThreshold ?? 2);
  const maxThreshold = Number(machineDetail?.tempMaxThreshold ?? 8);
  const latestPoint = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1] : null;
  const latestTimestamp = latestPoint?.recordedAt || machineDetail?.lastPingAt || null;

  const currentTemp = latestPoint
    ? latestPoint.temperature
    : machineDetail?.currentTemp ?? null;
  const currentHumidity = latestPoint
    ? latestPoint.humidity
    : machineDetail?.currentHumidity ?? null;

  const freshness: DataFreshnessState = useMemo(() => {
    if (loadingTelemetry) return 'LOADING';
    if (!latestPoint && currentTemp === null) return 'EMPTY';
    if (!latestTimestamp) return 'STALE';
    const ageMs = nowMs - new Date(latestTimestamp).getTime();
    if (
      ageMs > STALE_THRESHOLD_MS ||
      machineDetail?.status === 'OFFLINE'
    ) {
      return 'STALE';
    }
    return 'FRESH';
  }, [loadingTelemetry, latestPoint, currentTemp, latestTimestamp, nowMs, machineDetail?.status]);

  const currentStatus: ColdChainStatus = useMemo(() => {
    if (currentTemp === null) return 'NO_DATA';
    if (currentTemp > CRITICAL_TEMP_THRESHOLD) return 'CRITICAL';
    if (currentTemp > maxThreshold || currentTemp < minThreshold) return 'WARNING';
    return 'SAFE';
  }, [currentTemp, minThreshold, maxThreshold]);

  useEffect(() => {
    if (currentStatus === 'CRITICAL' && freshness === 'FRESH' && !isMuted) {
      alarmAudio.startAlarm();
    } else {
      alarmAudio.stopAlarm();
    }
    return () => {
      alarmAudio.stopAlarm();
    };
  }, [currentStatus, freshness, isMuted]);

  const machineNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const m of machines) {
      map[m.id] = `${m.name} (${m.serialNumber})`;
    }
    if (machineDetail && !map[machineDetail.id]) {
      map[machineDetail.id] = `${machineDetail.name} (${machineDetail.serialNumber})`;
    }
    return map;
  }, [machines, machineDetail]);

  const historyCount = useMemo(
    () => dataPoints.filter((p) => p.source !== 'REALTIME').length,
    [dataPoints]
  );
  const realtimeCount = useMemo(
    () => dataPoints.filter((p) => p.source === 'REALTIME').length,
    [dataPoints]
  );

  const handleSimulateTemp = async (temp: number, label: string) => {
    try {
      setSimulating(true);
      await axiosInstance.post(
        `/api/v1/simulator/machines/${machineId}/temperature-spike`,
        null,
        { params: { temp } }
      );
      toast.success(`Đã gửi lệnh Simulator: ${label} (${temp}°C). Chờ event WebSocket...`);
      await fetchMachinesAndDetail();
    } catch (err) {
      console.error('Lỗi gửi lệnh simulator:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleTogglePower = async () => {
    try {
      setSimulating(true);
      await axiosInstance.post(`/api/v1/simulator/machines/${machineId}/toggle-power`);
      toast.success('Đã chuyển trạng thái nguồn ONLINE/OFFLINE của máy.');
      await fetchMachinesAndDetail();
    } catch (err) {
      console.error('Lỗi bật/tắt nguồn máy:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    const updated = await alertService.acknowledgeAlert(alertId);
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    toast.success(`Đã tiếp nhận cảnh báo #${alertId}.`);
  };

  const handleResolvedAlert = (
    resolvedAlert: AlertItem,
    updatedMachineStatus?: MachineStatusValue
  ) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === resolvedAlert.id ? resolvedAlert : a))
    );
    if (updatedMachineStatus) {
      toast.success(
        `Đã đóng cảnh báo #${resolvedAlert.id} và cập nhật Máy #${resolvedAlert.machineId} → ${updatedMachineStatus}.`
      );
      void fetchMachinesAndDetail();
    } else {
      toast.success(`Đã đóng cảnh báo #${resolvedAlert.id}.`);
    }
  };

  const displayName = machineDetail
    ? `${machineDetail.name} (${machineDetail.serialNumber})`
    : `Máy #${machineId}`;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-gray-800 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/admin/machines')}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
              title="Quay lại danh sách máy"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Giám sát chuỗi lạnh Realtime
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 inline-flex items-center gap-1">
              <Activity className="w-3 h-3" /> REST API + STOMP WebSocket
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Nhận telemetry định kỳ từ VirtualIoTSimulator (10s/lần) và cảnh báo tức thời qua Spring WebSocket (/ws-freshvend).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={machineId}
            onChange={(e) => navigate(`/admin/machines/${e.target.value}/coldchain`)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white flex-1 md:flex-none"
          >
            {machines.length === 0 ? (
              <option value={machineId}>Máy #{machineId}</option>
            ) : (
              machines.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.id} — {m.name} ({m.serialNumber}) [{m.status}]
                </option>
              ))
            )}
          </select>

          <button
            onClick={() => {
              void fetchMachinesAndDetail();
              void fetchHistory();
              void fetchAlerts();
            }}
            disabled={loadingTelemetry}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTelemetry ? 'animate-spin' : ''}`} />
            Tải lại
          </button>
        </div>
      </div>

      {/* Thanh điều khiển Simulator gọi trực tiếp Backend SimulatorController */}
      <div className="bg-slate-900 p-4 rounded-2xl text-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            Điều khiển Simulator Backend (/api/v1/simulator/machines/{machineId})
          </span>
          <p className="text-xs text-slate-300 mt-0.5">
            Gửi sự kiện vào Backend để kiểm thử luồng ghi DB → đánh giá cảnh báo → đẩy WebSocket về màn hình đang mở không cần reload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => void handleSimulateTemp(9.5, 'Cảnh báo nhiệt cao')}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
          >
            <Zap className="w-3.5 h-3.5" /> Tăng 9.5°C (Warning)
          </button>

          <button
            onClick={() => void handleSimulateTemp(12.8, 'Sốc nhiệt khẩn cấp')}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
          >
            <Zap className="w-3.5 h-3.5" /> Sốc nhiệt 12.8°C (Critical)
          </button>

          <button
            onClick={() => void handleSimulateTemp(4.2, 'Hạ nhiệt an toàn')}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
          >
            <Snowflake className="w-3.5 h-3.5" /> Hạ về 4.2°C
          </button>

          <button
            onClick={() => void handleTogglePower()}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
          >
            <Power className="w-3.5 h-3.5" /> Bật/Tắt nguồn
          </button>
        </div>
      </div>

      <ColdChainStatusHeader
        status={currentStatus}
        freshness={freshness}
        currentTemp={currentTemp}
        currentHumidity={currentHumidity}
        doorLabel={formatDoorLabel(machineDetail)}
        machineStatus={machineDetail?.status}
        lastReceivedText={formatRelativeAge(latestTimestamp, nowMs)}
        minThreshold={minThreshold}
        maxThreshold={maxThreshold}
        criticalThreshold={CRITICAL_TEMP_THRESHOLD}
        wsStatus={telemetryWs.status}
        wsError={telemetryWs.errorMessage}
        onReconnectWs={telemetryWs.reconnect}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMuted = !isMuted;
          setIsMuted(nextMuted);
          alarmAudio.setMuted(nextMuted);
        }}
        machineName={displayName}
      />

      <ColdChainRealtimeChart
        data={dataPoints}
        machineId={machineId}
        machineName={displayName}
        minThreshold={minThreshold}
        maxThreshold={maxThreshold}
        criticalThreshold={CRITICAL_TEMP_THRESHOLD}
        freshness={freshness}
        historyCount={historyCount}
        realtimeCount={realtimeCount}
      />

      <MachineAlertsPanel
        alerts={alerts}
        loading={loadingAlerts}
        selectedMachineId={machineId}
        machineNameMap={machineNameMap}
        wsStatus={alertsWs.status}
        onReconnectWs={alertsWs.reconnect}
        onRefresh={() => void fetchAlerts()}
        onAcknowledge={handleAcknowledgeAlert}
        onOpenResolve={(alert) => setResolvingAlert(alert)}
      />

      <ResolveAlertModal
        alertItem={resolvingAlert}
        currentMachineStatus={
          resolvingAlert
            ? machines.find((m) => m.id === resolvingAlert.machineId)?.status ??
              machineDetail?.status
            : undefined
        }
        onClose={() => setResolvingAlert(null)}
        onSuccess={handleResolvedAlert}
      />
    </div>
  );
};