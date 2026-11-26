import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Cpu,
  DoorOpen,
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
  DoorSensorState,
  MachineConnectionState,
  MachineDetailDto,
  SensorHealthState,
  TelemetryPoint,
} from './types';

const MAX_CHART_POINTS = 40;
const STALE_THRESHOLD_MS = 30_000;
const CRITICAL_TEMP_THRESHOLD = 12.0;

interface RawTelemetryDto {
  id?: number;
  machineId?: number;
  temperature: number | null;
  humidity: number | null;
  recordedAt: string;
  doorOpen?: boolean | null;
  doorStatus?: string | null;
  sensorStatus?: string | null;
  sensorError?: string | null;
}

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

function detectSensorFault(
  temp: number | null,
  humidity: number | null,
  sensorStatus?: string | null,
  sensorError?: string | null
): string | null {
  if (sensorStatus && ['FAULT', 'ERROR', 'DISCONNECTED'].includes(sensorStatus.toUpperCase())) {
    return sensorError || `Cảm biến báo trạng thái ${sensorStatus}.`;
  }
  if (temp !== null && (!Number.isFinite(temp) || temp < -40 || temp > 80)) {
    return `Giá trị nhiệt độ bất thường (${temp}°C), ngoài dải hoạt động hợp lệ (-40°C đến 80°C).`;
  }
  if (humidity !== null && (!Number.isFinite(humidity) || humidity < 0 || humidity > 100)) {
    return `Giá trị độ ẩm bất thường (${humidity}%), ngoài dải hợp lệ (0%–100%).`;
  }
  return null;
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

  // Chế độ mô phỏng cục bộ cho Cửa mở & Lỗi cảm biến (BE SimulatorController hiện chưa có 2 endpoint này)
  const [simulatedDoorOpenSince, setSimulatedDoorOpenSince] = useState<number | null>(null);
  const [simulatedSensorFault, setSimulatedSensorFault] = useState<boolean>(false);

  // Reset mô phỏng cục bộ khi đổi sang máy khác
  useEffect(() => {
    setSimulatedDoorOpenSince(null);
    setSimulatedSensorFault(false);
  }, [machineId]);

  // Đồng hồ cập nhật trạng thái dữ liệu cũ (STALE) & thời gian cửa mở — không sinh dữ liệu telemetry giả
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 2000);
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
      const res = await axiosInstance.get<RawTelemetryDto[]>(
        `/api/v1/machines/${machineId}/telemetry/history`,
        { params: { limit: 30 } }
      );
      const list = Array.isArray(res.data) ? res.data : [];
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
          doorOpen: item.doorOpen ?? null,
          doorStatus: item.doorStatus ?? null,
          sensorStatus: item.sensorStatus ?? null,
          sensorError: item.sensorError ?? null,
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
  const telemetryWs = useWebSocketSubscription<RawTelemetryDto>(
    `/topic/telemetry/${machineId}`,
    (incoming) => {
      if (!incoming) return;

      const tempVal = incoming.temperature === null ? Number.NaN : Number(incoming.temperature);
      const humVal = incoming.humidity === null ? Number.NaN : Number(incoming.humidity);

      const nextPoint: TelemetryPoint = {
        id: incoming.id,
        machineId: incoming.machineId ?? machineId,
        temperature: tempVal,
        humidity: humVal,
        recordedAt: incoming.recordedAt || new Date().toISOString(),
        timeLabel: formatTime(incoming.recordedAt),
        source: 'REALTIME',
        doorOpen: incoming.doorOpen ?? null,
        doorStatus: incoming.doorStatus ?? null,
        sensorStatus: incoming.sensorStatus ?? null,
        sensorError: incoming.sensorError ?? null,
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
              currentTemp: Number.isFinite(tempVal) ? tempVal : prev.currentTemp,
              currentHumidity: Number.isFinite(humVal) ? humVal : prev.currentHumidity,
              lastPingAt: nextPoint.recordedAt,
              doorOpen: incoming.doorOpen ?? prev.doorOpen,
              doorStatus: incoming.doorStatus ?? prev.doorStatus,
              sensorStatus: incoming.sensorStatus ?? prev.sensorStatus,
            }
          : prev
      );
    }
  );

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

    if (incomingAlert.machineId === machineId && incomingAlert.severity === 'CRITICAL') {
      void fetchMachinesAndDetail();
    }
  });

  const minThreshold = Number(machineDetail?.tempMinThreshold ?? 2);
  const maxThreshold = Number(machineDetail?.tempMaxThreshold ?? 8);
  const latestPoint = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1] : null;
  const latestTimestamp = latestPoint?.recordedAt || machineDetail?.lastPingAt || null;

  const rawTemp = latestPoint
    ? latestPoint.temperature
    : machineDetail?.currentTemp ?? null;
  const rawHumidity = latestPoint
    ? latestPoint.humidity
    : machineDetail?.currentHumidity ?? null;

  const freshness: DataFreshnessState = useMemo(() => {
    if (loadingTelemetry) return 'LOADING';
    if (!latestPoint && rawTemp === null) return 'EMPTY';
    if (!latestTimestamp) return 'STALE';
    const ageMs = nowMs - new Date(latestTimestamp).getTime();
    if (ageMs > STALE_THRESHOLD_MS || machineDetail?.status === 'OFFLINE') {
      return 'STALE';
    }
    return 'FRESH';
  }, [loadingTelemetry, latestPoint, rawTemp, latestTimestamp, nowMs, machineDetail?.status]);

  // Trạng thái kết nối thiết bị tách biệt hoàn toàn với trạng thái WebSocket & cảm biến
  const machineConnection: MachineConnectionState = useMemo(() => {
    if (!machineDetail) return 'UNKNOWN';
    if (machineDetail.status === 'OFFLINE') return 'OFFLINE';
    if (machineDetail.status === 'MAINTENANCE') return 'MAINTENANCE';
    if (machineDetail.status === 'OUT_OF_ORDER' || machineDetail.status === 'ERROR') {
      return 'OUT_OF_ORDER';
    }
    if (latestTimestamp) {
      const ageMs = nowMs - new Date(latestTimestamp).getTime();
      if (ageMs > STALE_THRESHOLD_MS) return 'STALE_PING';
    }
    return 'CONNECTED';
  }, [machineDetail, latestTimestamp, nowMs]);

  // Trạng thái sức khỏe cảm biến (phát hiện lỗi từ dữ liệu BE hoặc chế độ mô phỏng lỗi cảm biến)
  const detectedFaultReason = useMemo(() => {
    if (simulatedSensorFault) {
      return 'Mô phỏng mất tín hiệu đầu dò nhiệt độ/độ ẩm (chế độ test FE — chờ BE3 bổ sung API sensor-fault).';
    }
    return detectSensorFault(
      rawTemp,
      rawHumidity,
      latestPoint?.sensorStatus ?? machineDetail?.sensorStatus,
      latestPoint?.sensorError
    );
  }, [
    simulatedSensorFault,
    rawTemp,
    rawHumidity,
    latestPoint?.sensorStatus,
    latestPoint?.sensorError,
    machineDetail?.sensorStatus,
  ]);

  const sensorHealth: SensorHealthState = useMemo(() => {
    if (detectedFaultReason) return 'FAULT';
    if (freshness === 'EMPTY' || freshness === 'LOADING') return 'NO_DATA';
    if (freshness === 'STALE') return 'STALE';
    return 'OK';
  }, [detectedFaultReason, freshness]);

  // Trạng thái cửa tủ (ưu tiên trạng thái mô phỏng nếu đang bật, sau đó đọc field từ BE nếu có)
  const { doorState, doorLabel, isDoorSimulated } = useMemo<{
    doorState: DoorSensorState;
    doorLabel: string;
    isDoorSimulated: boolean;
  }>(() => {
    if (simulatedDoorOpenSince !== null) {
      const openSec = Math.max(0, Math.floor((nowMs - simulatedDoorOpenSince) / 1000));
      return {
        doorState: 'OPEN',
        doorLabel: `Đang mở (${openSec}s)`,
        isDoorSimulated: true,
      };
    }

    const beDoorOpen = latestPoint?.doorOpen ?? machineDetail?.doorOpen;
    const beDoorStatus = latestPoint?.doorStatus ?? machineDetail?.doorStatus;

    if (typeof beDoorOpen === 'boolean') {
      return {
        doorState: beDoorOpen ? 'OPEN' : 'CLOSED',
        doorLabel: beDoorOpen ? 'Đang mở' : 'Đã đóng',
        isDoorSimulated: false,
      };
    }
    if (beDoorStatus) {
      const upper = beDoorStatus.toUpperCase();
      if (upper === 'OPEN' || upper === 'AJAR') {
        return { doorState: 'OPEN', doorLabel: 'Đang mở', isDoorSimulated: false };
      }
      if (upper === 'CLOSED') {
        return { doorState: 'CLOSED', doorLabel: 'Đã đóng', isDoorSimulated: false };
      }
      return { doorState: 'UNKNOWN', doorLabel: beDoorStatus, isDoorSimulated: false };
    }
    return {
      doorState: 'UNKNOWN',
      doorLabel: 'Chưa có cảm biến từ BE',
      isDoorSimulated: false,
    };
  }, [simulatedDoorOpenSince, nowMs, latestPoint, machineDetail]);

  const currentStatus: ColdChainStatus = useMemo(() => {
    if (sensorHealth === 'FAULT') return 'SENSOR_ERROR';
    if (rawTemp === null || !Number.isFinite(rawTemp)) return 'NO_DATA';
    if (rawTemp > CRITICAL_TEMP_THRESHOLD) return 'CRITICAL';
    if (rawTemp > maxThreshold || rawTemp < minThreshold) return 'WARNING';
    return 'SAFE';
  }, [sensorHealth, rawTemp, minThreshold, maxThreshold]);

  useEffect(() => {
    const shouldAlarm =
      (currentStatus === 'CRITICAL' && freshness === 'FRESH') ||
      currentStatus === 'SENSOR_ERROR';
    if (shouldAlarm && !isMuted) {
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

  // Chỉ đưa các điểm số hợp lệ vào biểu đồ Recharts
  const validChartPoints = useMemo(
    () =>
      dataPoints.filter(
        (p) => Number.isFinite(p.temperature) && Number.isFinite(p.humidity)
      ),
    [dataPoints]
  );

  const historyCount = useMemo(
    () => validChartPoints.filter((p) => p.source !== 'REALTIME').length,
    [validChartPoints]
  );
  const realtimeCount = useMemo(
    () => validChartPoints.filter((p) => p.source === 'REALTIME').length,
    [validChartPoints]
  );

  const handleSimulateTemp = async (temp: number, label: string) => {
    try {
      setSimulating(true);
      setSimulatedSensorFault(false);
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

  const handleToggleDoorSimulation = () => {
    if (simulatedDoorOpenSince !== null) {
      setSimulatedDoorOpenSince(null);
      toast.success('Đã tắt chế độ mô phỏng cửa mở.');
    } else {
      setSimulatedDoorOpenSince(Date.now());
      toast.warning(
        'Đang bật mô phỏng Cửa mở trên FE (Backend SimulatorController chưa có endpoint cửa).'
      );
    }
  };

  const handleToggleSensorFaultSimulation = () => {
    const next = !simulatedSensorFault;
    setSimulatedSensorFault(next);
    if (next) {
      toast.error(
        'Đang bật mô phỏng Lỗi cảm biến trên FE (Backend SimulatorController chưa có endpoint sensor-fault).'
      );
    } else {
      toast.success('Đã khôi phục trạng thái cảm biến về dữ liệu thật.');
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

      {/* Thanh điều khiển Simulator (Backend API + Mô phỏng trạng thái cửa & lỗi cảm biến) */}
      <div className="bg-slate-900 p-4 rounded-2xl text-white flex flex-col gap-3 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Điều khiển Simulator (/api/v1/simulator/machines/{machineId})
            </span>
            <p className="text-xs text-slate-300 mt-0.5">
              Nhiệt độ &amp; Nguồn gọi trực tiếp Backend Simulator; Cửa mở &amp; Lỗi cảm biến đang mô phỏng phía FE (sẵn sàng nối khi BE3 mở endpoint).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <div className="h-6 w-px bg-slate-700 hidden sm:block mx-1" />

          <button
            onClick={handleToggleDoorSimulation}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
              simulatedDoorOpenSince !== null
                ? 'bg-orange-500 hover:bg-orange-600 text-white ring-2 ring-orange-300'
                : 'bg-slate-800 hover:bg-slate-700 text-orange-300 border border-orange-500/40'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            {simulatedDoorOpenSince !== null ? 'Đóng cửa (Đang mở)' : 'Giả lập Cửa mở'}
          </button>

          <button
            onClick={handleToggleSensorFaultSimulation}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
              simulatedSensorFault
                ? 'bg-purple-600 hover:bg-purple-700 text-white ring-2 ring-purple-300'
                : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            {simulatedSensorFault ? 'Khôi phục cảm biến' : 'Giả lập Lỗi cảm biến'}
          </button>
        </div>
      </div>

      <ColdChainStatusHeader
        status={currentStatus}
        freshness={freshness}
        machineConnection={machineConnection}
        sensorHealth={sensorHealth}
        sensorFaultMessage={detectedFaultReason}
        doorState={doorState}
        doorLabel={doorLabel}
        isDoorSimulated={isDoorSimulated}
        isSensorSimulated={simulatedSensorFault}
        currentTemp={rawTemp !== null && Number.isFinite(rawTemp) ? rawTemp : null}
        currentHumidity={
          rawHumidity !== null && Number.isFinite(rawHumidity) ? rawHumidity : null
        }
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
        data={validChartPoints}
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