/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { DataFreshnessState, TelemetryPoint } from '../types';

interface Props {
  data: TelemetryPoint[];
  machineId: number;
  machineName: string;
  minThreshold: number;
  maxThreshold: number;
  criticalThreshold: number;
  freshness: DataFreshnessState;
  historyCount: number;
  realtimeCount: number;
}

export const ColdChainRealtimeChart: React.FC<Props> = ({
  data,
  machineId,
  machineName,
  minThreshold,
  maxThreshold,
  criticalThreshold,
  freshness,
  historyCount,
  realtimeCount,
}) => {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Biểu Đồ Nhiệt Độ &amp; Độ Ẩm Theo Thời Gian — {machineName}
          </h3>
          <p className="text-xs text-gray-500">
            Nguồn: REST <span className="font-mono text-gray-700">/telemetry/history</span> ({historyCount} điểm) + STOMP WebSocket{' '}
            <span className="font-mono text-blue-600 font-semibold">/topic/telemetry/{machineId}</span> (+{realtimeCount} điểm mới)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-blue-600">
            <span className="w-3 h-1 bg-blue-600 rounded-full" /> Nhiệt độ (°C)
          </span>
          <span className="flex items-center gap-1.5 text-cyan-500">
            <span className="w-3 h-1 bg-cyan-500 rounded-full" /> Độ ẩm (%)
          </span>
        </div>
      </div>

      {freshness === 'LOADING' ? (
        <div className="h-80 w-full flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
          Đang tải lịch sử telemetry từ Backend...
        </div>
      ) : data.length === 0 ? (
        <div className="h-80 w-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center p-6">
          <p className="text-sm font-semibold text-gray-700">
            Chưa có dữ liệu telemetry cho {machineName}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            Biểu đồ sẽ tự động hiển thị ngay khi VirtualIoTSimulator (mỗi 10 giây) hoặc nút giả lập phát dữ liệu mới qua WebSocket.
          </p>
        </div>
      ) : (
        <div className="h-84 md:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 18, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

              <XAxis
                dataKey="timeLabel"
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                tick={{ fill: '#64748B', fontSize: 11 }}
                minTickGap={16}
              />

              <YAxis
                yAxisId="temp"
                domain={[
                  (dataMin: number) => Math.min(0, Math.floor(Math.min(dataMin, minThreshold) - 2)),
                  (dataMax: number) => Math.max(16, Math.ceil(Math.max(dataMax, criticalThreshold) + 2)),
                ]}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                tick={{ fill: '#2563EB', fontSize: 11 }}
                unit="°C"
              />

              <YAxis
                yAxisId="hum"
                orientation="right"
                domain={[0, 100]}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                tick={{ fill: '#06B6D4', fontSize: 11 }}
                unit="%"
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.94)',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
                labelFormatter={(label, payload) => {
                  const point = payload?.[0]?.payload as TelemetryPoint | undefined;
                  const sourceTag = point?.source === 'REALTIME' ? ' • Realtime WS' : ' • History API';
                  return `${label}${sourceTag}`;
                }}
                formatter={((val: any, name: any) => [
                  String(name).includes('Nhiệt độ')
                    ? `${Number(val).toFixed(2)}°C`
                    : `${Number(val).toFixed(1)}%`,
                  name,
                ]) as any}
              />

              <Legend verticalAlign="top" height={34} iconType="circle" />

              <ReferenceArea
                yAxisId="temp"
                y1={minThreshold}
                y2={maxThreshold}
                fill="#10B981"
                fillOpacity={0.08}
              />

              <ReferenceLine
                yAxisId="temp"
                y={minThreshold}
                stroke="#0EA5E9"
                strokeDasharray="3 3"
                label={{
                  value: `Ngưỡng thấp (${minThreshold}°C)`,
                  fill: '#0284C7',
                  position: 'insideBottomLeft',
                  fontSize: 10,
                }}
              />

              <ReferenceLine
                yAxisId="temp"
                y={maxThreshold}
                stroke="#F59E0B"
                strokeDasharray="4 3"
                label={{
                  value: `Ngưỡng cảnh báo (${maxThreshold}°C)`,
                  fill: '#D97706',
                  position: 'insideTopLeft',
                  fontSize: 10,
                }}
              />

              <ReferenceLine
                yAxisId="temp"
                y={criticalThreshold}
                stroke="#EF4444"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `NGƯỠNG KHẨN CẤP (${criticalThreshold}°C)`,
                  fill: '#DC2626',
                  position: 'top',
                  fontSize: 11,
                  fontWeight: 'bold',
                }}
              />

              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperature"
                name="Nhiệt độ (°C)"
                stroke="#2563EB"
                strokeWidth={2.75}
                dot={{ r: 2.5 }}
                activeDot={{ r: 6, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              <Line
                yAxisId="hum"
                type="monotone"
                dataKey="humidity"
                name="Độ ẩm (%)"
                stroke="#06B6D4"
                strokeWidth={2}
                dot={false}
                strokeDasharray="3 3"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};