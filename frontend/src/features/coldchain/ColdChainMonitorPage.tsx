import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { axiosInstance } from '../../shared/api/axiosInstance';
import { useWebSocketSubscription } from '../../shared/realtime/useWebSocketSubscription';

interface TelemetryPoint {
  id?: number;
  temperature: number;
  humidity: number;
  recordedAt: string;
  timeLabel?: string;
}

function formatTime(isoString?: string) {
  const date = isoString ? new Date(isoString) : new Date();
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const ColdChainMonitorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dataPoints, setDataPoints] = useState<TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    axiosInstance
      .get<TelemetryPoint[]>(`/api/v1/machines/${id}/telemetry/history?limit=30`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const formatted = list
          .slice()
          .reverse()
          .map((item) => ({
            ...item,
            timeLabel: formatTime(item.recordedAt),
          }));
        setDataPoints(formatted);
      })
      .catch((err) => console.error('Lỗi tải lịch sử nhiệt độ:', err))
      .finally(() => setLoading(false));
  }, [id]);

  useWebSocketSubscription<TelemetryPoint>(
    id ? `/topic/telemetry/${id}` : '',
    (newPoint) => {
      const pointWithLabel: TelemetryPoint = {
        ...newPoint,
        timeLabel: formatTime(newPoint.recordedAt),
      };

      setDataPoints((prev) => {
        const updated = [...prev, pointWithLabel];
        return updated.length > 30 ? updated.slice(updated.length - 30) : updated;
      });
    }
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Giám sát Chuỗi lạnh Thời gian thực — Máy #{id}
        </h1>
        <p className="text-sm text-gray-500">
          Ngưỡng an toàn bảo quản trái cây: 2°C đến 8°C (Cập nhật mỗi 10 giây)
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="h-80 flex items-center justify-center text-gray-500">
            Đang tải dữ liệu cảm biến...
          </div>
        ) : (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeLabel" />
                <YAxis yAxisId="temp" domain={[0, 16]} unit="°C" />
                <YAxis yAxisId="hum" orientation="right" domain={[50, 100]} unit="%" />
                <Tooltip />
                <Legend />

                <ReferenceLine
                  yAxisId="temp"
                  y={8}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{ value: 'Giới hạn trên (8°C)', fill: '#dc2626', position: 'top' }}
                />
                <ReferenceLine
                  yAxisId="temp"
                  y={2}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{ value: 'Giới hạn dưới (2°C)', fill: '#dc2626', position: 'bottom' }}
                />

                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  name="Nhiệt độ (°C)"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="hum"
                  type="monotone"
                  dataKey="humidity"
                  name="Độ ẩm (%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};