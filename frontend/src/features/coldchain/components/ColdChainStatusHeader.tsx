import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  DoorClosed,
  Database,
} from 'lucide-react';
import type { WebSocketConnectionStatus } from '../../../shared/realtime/useWebSocketSubscription';
import type { ColdChainStatus, DataFreshnessState } from '../types';

interface Props {
  status: ColdChainStatus;
  freshness: DataFreshnessState;
  currentTemp: number | null;
  currentHumidity: number | null;
  doorLabel: string;
  machineStatus?: string;
  lastReceivedText: string;
  minThreshold: number;
  maxThreshold: number;
  criticalThreshold: number;
  wsStatus: WebSocketConnectionStatus;
  wsError?: string | null;
  onReconnectWs: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  machineName: string;
}

function getWsBadgeConfig(wsStatus: WebSocketConnectionStatus) {
  switch (wsStatus) {
    case 'CONNECTED':
      return {
        label: 'WebSocket Đã kết nối',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        connected: true,
      };
    case 'RECONNECTING':
    case 'CONNECTING':
      return {
        label: wsStatus === 'CONNECTING' ? 'Đang kết nối WS...' : 'Đang kết nối lại WS...',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        connected: false,
      };
    default:
      return {
        label: 'WebSocket Mất kết nối',
        className: 'bg-red-100 text-red-800 border-red-200',
        connected: false,
      };
  }
}

function getFreshnessBadge(freshness: DataFreshnessState) {
  switch (freshness) {
    case 'LOADING':
      return {
        label: 'Đang tải dữ liệu...',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    case 'EMPTY':
      return {
        label: 'Chưa có dữ liệu telemetry',
        className: 'bg-gray-100 text-gray-700 border-gray-300',
      };
    case 'STALE':
      return {
        label: 'Dữ liệu cũ (quá 30 giây)',
        className: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    case 'FRESH':
      return {
        label: 'Dữ liệu realtime mới',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
  }
}

export const ColdChainStatusHeader: React.FC<Props> = ({
  status,
  freshness,
  currentTemp,
  currentHumidity,
  doorLabel,
  machineStatus,
  lastReceivedText,
  minThreshold,
  maxThreshold,
  criticalThreshold,
  wsStatus,
  wsError,
  onReconnectWs,
  isMuted,
  onToggleMute,
  machineName,
}) => {
  const wsBadge = getWsBadgeConfig(wsStatus);
  const freshnessBadge = getFreshnessBadge(freshness);

  const bannerStyle =
    status === 'NO_DATA'
      ? 'bg-slate-50 border-slate-200 text-slate-900'
      : status === 'SAFE'
      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
      : status === 'WARNING'
      ? 'bg-amber-50/80 border-amber-200 text-amber-950'
      : 'bg-red-50 border-red-300 text-red-950 ring-4 ring-red-400/30';

  return (
    <div className="space-y-4">
      <div
        className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${bannerStyle}`}
      >
        <div className="flex items-start gap-4">
          <div className="relative flex items-center justify-center mt-1 shrink-0">
            <span
              className={`w-5 h-5 rounded-full inline-block ${
                status === 'NO_DATA'
                  ? 'bg-slate-400'
                  : status === 'SAFE'
                  ? 'bg-emerald-500'
                  : status === 'WARNING'
                  ? 'bg-amber-500'
                  : 'bg-red-600 animate-ping'
              }`}
            />
            <span
              className={`absolute w-3 h-3 rounded-full ${
                status === 'NO_DATA'
                  ? 'bg-slate-200'
                  : status === 'SAFE'
                  ? 'bg-emerald-200'
                  : status === 'WARNING'
                  ? 'bg-amber-200'
                  : 'bg-white'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg md:text-xl font-black tracking-tight">
                {status === 'NO_DATA' && `CHƯA CÓ TELEMETRY (${machineName})`}
                {status === 'SAFE' && `BUỒNG LẠNH AN TOÀN (${machineName})`}
                {status === 'WARNING' && `CẢNH BÁO NGƯỠNG NHIỆT (${machineName})`}
                {status === 'CRITICAL' && `NGUY HIỂM: NHIỆT ĐỘ VƯỢT NGƯỠNG! (${machineName})`}
              </h2>

              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${freshnessBadge.className}`}
              >
                {freshness === 'FRESH' ? (
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                ) : (
                  <Database className="w-3 h-3" />
                )}
                {freshnessBadge.label}
              </span>

              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${wsBadge.className}`}
              >
                {wsBadge.connected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                {wsBadge.label}
              </span>

              {!wsBadge.connected && (
                <button
                  onClick={onReconnectWs}
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                >
                  <RefreshCw className="w-3 h-3" /> Thử kết nối lại
                </button>
              )}
            </div>

            <p className="text-sm opacity-85">
              {status === 'NO_DATA' &&
                'Backend chưa ghi nhận bản ghi nhiệt độ/độ ẩm nào cho máy này. Hãy bật máy ONLINE hoặc chạy Simulator để phát sự kiện.'}
              {status === 'SAFE' &&
                currentTemp !== null &&
                `Nhiệt độ ${currentTemp.toFixed(1)}°C nằm trong ngưỡng cài đặt (${minThreshold.toFixed(1)}°C – ${maxThreshold.toFixed(1)}°C).`}
              {status === 'WARNING' &&
                currentTemp !== null &&
                `Nhiệt độ ${currentTemp.toFixed(1)}°C nằm ngoài ngưỡng chuẩn (${minThreshold.toFixed(1)}°C – ${maxThreshold.toFixed(1)}°C). Vi phạm 3 lần liên tiếp sẽ chuyển CRITICAL.`}
              {status === 'CRITICAL' &&
                currentTemp !== null &&
                `Nhiệt độ đạt ${currentTemp.toFixed(1)}°C (ngưỡng khẩn cấp ${criticalThreshold.toFixed(1)}°C). Backend tự động chuyển máy sang OUT_OF_ORDER để bảo vệ thực phẩm.`}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-0.5">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Nhận gần nhất: <strong>{lastReceivedText}</strong>
              </span>
              <span className="inline-flex items-center gap-1">
                <DoorClosed className="w-3.5 h-3.5" />
                Cửa tủ: <strong>{doorLabel}</strong>
              </span>
              {machineStatus && (
                <span>
                  Trạng thái máy: <strong>{machineStatus}</strong>
                </span>
              )}
            </div>

            {wsError && (
              <p className="text-xs text-red-700 font-medium">Lỗi WS: {wsError}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/90 px-5 py-3 rounded-xl border border-gray-200/70 shadow-2xs self-stretch lg:self-auto justify-between lg:justify-end">
          <div className="text-right">
            <span className="text-xs text-gray-500 font-medium block">Nhiệt độ</span>
            <span
              className={`text-2xl font-black font-mono ${
                status === 'NO_DATA'
                  ? 'text-gray-400'
                  : status === 'SAFE'
                  ? 'text-emerald-600'
                  : status === 'WARNING'
                  ? 'text-amber-600'
                  : 'text-red-600'
              }`}
            >
              {currentTemp !== null ? `${currentTemp.toFixed(1)}°C` : '--'}
            </span>
          </div>

          <div className="h-8 w-px bg-gray-200" />

          <div className="text-right">
            <span className="text-xs text-gray-500 font-medium block">Độ ẩm</span>
            <span className="text-2xl font-black font-mono text-cyan-600">
              {currentHumidity !== null ? `${currentHumidity.toFixed(0)}%` : '--'}
            </span>
          </div>

          {status === 'CRITICAL' && (
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Bật còi báo động' : 'Tắt tiếng còi'}
              className={`ml-1 px-3 py-2 rounded-xl text-white font-bold transition-all shadow-sm flex items-center gap-1.5 text-xs ${
                isMuted ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'Đã tắt còi' : 'Tắt còi'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-800">
              Dải chuẩn của máy: {minThreshold.toFixed(1)}°C – {maxThreshold.toFixed(1)}°C
            </span>
            <p className="text-gray-500 text-[11px]">
              Lấy trực tiếp từ cấu hình tempMinThreshold / tempMaxThreshold ở Backend.
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-800">
              Cảnh báo WARNING: Ngoài {minThreshold.toFixed(1)}°C – {maxThreshold.toFixed(1)}°C
            </span>
            <p className="text-gray-500 text-[11px]">
              Phát cảnh báo lên /topic/alerts; 3 lần vi phạm liên tiếp tự leo thang CRITICAL.
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-red-100 flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-800">
              Khẩn cấp CRITICAL: Lớn hơn {criticalThreshold.toFixed(1)}°C
            </span>
            <p className="text-gray-500 text-[11px]">
              Backend lập tức phát CRITICAL và chuyển máy sang OUT_OF_ORDER.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};