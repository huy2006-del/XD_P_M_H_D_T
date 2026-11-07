/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Zap, Snowflake, HelpCircle, Activity } from 'lucide-react';
import { axiosInstance } from '../../shared/api/axiosInstance';
import { useWebSocketSubscription } from '../../shared/realtime/useWebSocketSubscription';
import { ColdChainStatusHeader } from './components/ColdChainStatusHeader';
import { ColdChainRealtimeChart } from './components/ColdChainRealtimeChart';
import { KafkaPipelineVisualizer } from './components/KafkaPipelineVisualizer';
import { ResearchQuestion2Tab } from './components/ResearchQuestion2Tab';
import { alarmAudio } from './utils/audioAlarm';
import type { TelemetryPoint, ColdChainStatus } from './types';

function formatTime(isoString?: string) {
  const date = isoString ? new Date(isoString) : new Date();
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const INITIAL_DEMO_POINTS: TelemetryPoint[] = Array.from({ length: 15 }).map((_, i) => {
  const time = new Date(Date.now() - (15 - i) * 5000);
  return {
    id: i + 1,
    temperature: Number((4.0 + Math.sin(i * 0.6) * 1.5).toFixed(1)),
    humidity: Number((82 + Math.cos(i * 0.5) * 4).toFixed(0)),
    recordedAt: time.toISOString(),
    timeLabel: formatTime(time.toISOString()),
  };
});

export const ColdChainMonitorPage: React.FC = () => {
  const { id = '1' } = useParams();
  const machineId = Number(id) || 1;
  const navigate = useNavigate();

  const [dataPoints, setDataPoints] = useState<TelemetryPoint[]>(INITIAL_DEMO_POINTS);
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RESEARCH_Q2'>('DASHBOARD');
  const [isSpiking, setIsSpiking] = useState(false);

  const latestPoint = dataPoints[dataPoints.length - 1] || {
    temperature: 4.5,
    humidity: 85,
  };

  const currentStatus: ColdChainStatus =
    latestPoint.temperature > 10.0
      ? 'CRITICAL'
      : latestPoint.temperature > 8.0
      ? 'WARNING'
      : 'SAFE';

  useEffect(() => {
    if (currentStatus === 'CRITICAL' && !isMuted) {
      alarmAudio.startAlarm();
    } else {
      alarmAudio.stopAlarm();
    }

    return () => {
      alarmAudio.stopAlarm();
    };
  }, [currentStatus, isMuted]);

  const fetchHistory = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get<TelemetryPoint[]>(`/api/v1/machines/${machineId}/telemetry/history?limit=30`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) {
          const formatted = list
            .slice()
            .reverse()
            .map((item: any) => ({
              ...item,
              timeLabel: formatTime(item.recordedAt),
            }));
          setDataPoints(formatted);
        }
      })
      .catch(() => {
        // Fallback demo points
      })
      .finally(() => setLoading(false));
  }, [machineId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useWebSocketSubscription(
    `/topic/telemetry/${machineId}`,
    (newPoint: any) => {
      if (!newPoint) return;
      const pointWithLabel: TelemetryPoint = {
        temperature: Number(newPoint.temperature) || 0,
        humidity: Number(newPoint.humidity) || 0,
        recordedAt: newPoint.recordedAt || new Date().toISOString(),
        timeLabel: formatTime(newPoint.recordedAt),
      };

      setDataPoints((prev) => {
        const updated = [...prev, pointWithLabel];
        return updated.length > 30 ? updated.slice(updated.length - 30) : updated;
      });
    }
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setDataPoints((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return prev;

        let newTemp: number;
        if (isSpiking) {
          newTemp = Number((11.2 + Math.random() * 1.5).toFixed(1));
        } else {
          const delta = (Math.random() - 0.48) * 0.6;
          newTemp = Number(Math.max(2.5, Math.min(7.8, last.temperature + delta)).toFixed(1));
        }

        const newHum = Number(Math.max(78, Math.min(92, last.humidity + (Math.random() - 0.5) * 2)).toFixed(0));
        const now = new Date().toISOString();

        const newPoint: TelemetryPoint = {
          temperature: newTemp,
          humidity: newHum,
          recordedAt: now,
          timeLabel: formatTime(now),
        };

        const updated = [...prev, newPoint];
        return updated.length > 30 ? updated.slice(updated.length - 30) : updated;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [isSpiking]);

  const handleTriggerTempSpike = async () => {
    setIsSpiking(true);
    try {
      await axiosInstance.post(`/api/v1/simulator/machines/${machineId}/temp-spike?temp=12.5`);
    } catch {
      const now = new Date().toISOString();
      setDataPoints((prev) => [
        ...prev,
        {
          temperature: 12.8,
          humidity: 88,
          recordedAt: now,
          timeLabel: formatTime(now),
        },
      ]);
    }
  };

  const handleResetToNormal = async () => {
    setIsSpiking(false);
    try {
      await axiosInstance.post(`/api/v1/simulator/machines/${machineId}/temp-spike?temp=4.2`);
    } catch {
      const now = new Date().toISOString();
      setDataPoints((prev) => [
        ...prev,
        {
          temperature: 4.2,
          humidity: 84,
          recordedAt: now,
          timeLabel: formatTime(now),
        },
      ]);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-gray-800 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              FreshVend Cold-Chain Realtime Telemetry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
              <Activity className="w-3 h-3" /> FE 2 Visualizer
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Hệ thống giám sát chuỗi lạnh & Cảnh báo an toàn thực phẩm theo tài liệu Apache Kafka.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={machineId}
            onChange={(e) => navigate(`/admin/machines/${e.target.value}/coldchain`)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="1">Máy #01 - Landmark 81 (MC-01)</option>
            <option value="2">Máy #02 - Tòa nhà Bitexco (MC-02)</option>
            <option value="3">Máy #03 - Vinhomes Central Park (MC-03)</option>
          </select>

          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'DASHBOARD'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dashboard Realtime
          </button>

          <button
            onClick={() => setActiveTab('RESEARCH_Q2')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
              activeTab === 'RESEARCH_Q2'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" /> Nghiên Cứu 2 (Kafka)
          </button>
        </div>
      </div>

      {activeTab === 'DASHBOARD' ? (
        <>
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                🧪 Bảng Điều Khiển Giả Lập Sự Cố (Demo Testing Controls)
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                Bấm nút để ép máy nhảy nhiệt độ cao tức thì phục vụ demo cảnh báo cho giảng viên xem.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleTriggerTempSpike}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95 animate-pulse"
              >
                <Zap className="w-4 h-4" /> Kích Hoạt Sốc Nhiệt (&gt;10°C)
              </button>

              <button
                onClick={handleResetToNormal}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95"
              >
                <Snowflake className="w-4 h-4" /> Hạ Nhiệt An Toàn (4.2°C)
              </button>

              <button
                onClick={fetchHistory}
                disabled={loading}
                title="Tải lại lịch sử từ backend"
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <ColdChainStatusHeader
            status={currentStatus}
            currentTemp={latestPoint.temperature}
            currentHumidity={latestPoint.humidity}
            isMuted={isMuted}
            onToggleMute={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              alarmAudio.setMuted(nextMuted);
            }}
            machineName={`Máy #${machineId}`}
          />

          <KafkaPipelineVisualizer
            currentTemp={latestPoint.temperature}
            status={currentStatus}
            machineId={machineId}
          />

          <ColdChainRealtimeChart
            data={dataPoints}
            machineName={`Máy #${machineId}`}
          />
        </>
      ) : (
        <ResearchQuestion2Tab />
      )}
    </div>
  );
};
