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
import type { TelemetryPoint } from '../types';

interface Props {
  data: TelemetryPoint[];
  machineName: string;
}

export const ColdChainRealtimeChart: React.FC<Props> = ({ data, machineName }) => {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Biểu Đồ Biến Thiên Chuỗi Lạnh Realtime — {machineName}
          </h3>
          <p className="text-xs text-gray-500">
            Dữ liệu tiếp nhận liên tục qua Apache Kafka Topic <span className="font-mono text-blue-600 font-bold">machine-telemetry-stream</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-blue-600">
            <span className="w-3 h-1 bg-blue-600 rounded-full" /> Nhiệt độ (°C)
          </span>
          <span className="flex items-center gap-1.5 text-cyan-500 ml-2">
            <span className="w-3 h-1 bg-cyan-500 rounded-full" /> Độ ẩm (%)
          </span>
        </div>
      </div>

      <div className="h-84 md:h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

            <XAxis
              dataKey="timeLabel"
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              tick={{ fill: '#64748B', fontSize: 11 }}
            />

            <YAxis
              yAxisId="temp"
              domain={[0, 16]}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              tick={{ fill: '#2563EB', fontSize: 11 }}
              unit="°C"
            />

            <YAxis
              yAxisId="hum"
              orientation="right"
              domain={[40, 100]}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              tick={{ fill: '#06B6D4', fontSize: 11 }}
              unit="%"
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                borderRadius: '12px',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={((val: any, name: any) => [
                name?.includes('Nhiệt độ') ? `${Number(val)?.toFixed(1)}°C` : `${Number(val)?.toFixed(0)}%`,
                name,
              ]) as any}
            />

            <Legend verticalAlign="top" height={36} iconType="circle" />

            <ReferenceArea
              yAxisId="temp"
              y1={2}
              y2={8}
              fill="#10B981"
              fillOpacity={0.06}
            />

            <ReferenceLine
              yAxisId="temp"
              y={10}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: 'NGƯỠNG HỎNG HOA QUẢ (10°C)',
                fill: '#DC2626',
                position: 'top',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />

            <ReferenceLine
              yAxisId="temp"
              y={8}
              stroke="#F59E0B"
              strokeDasharray="3 3"
              label={{
                value: 'Giới hạn an toàn (8°C)',
                fill: '#D97706',
                position: 'insideTopLeft',
                fontSize: 10,
              }}
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="Nhiệt độ (°C)"
              stroke="#2563EB"
              strokeWidth={3}
              dot={false}
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
              strokeDasharray="2 2"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};