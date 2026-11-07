import React from 'react';
import { Database, Activity, ShieldAlert, MonitorCheck, ArrowRight, Cpu, Layers } from 'lucide-react';
import type { ColdChainStatus } from '../types';

interface Props {
  currentTemp: number;
  status: ColdChainStatus;
  machineId: number;
}

export const KafkaPipelineVisualizer: React.FC<Props> = ({ currentTemp, status, machineId }) => {
  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl border border-slate-800 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Cpu className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Apache Kafka Telemetry Pipeline (Đồ Họa Luồng Phân Tán)
            </h3>
            <p className="text-xs text-slate-400">
              Kiến trúc chuẩn doanh nghiệp: Distributed Commit Log & Multi-Consumer Group
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Topic: machine-telemetry-stream</span>
        </div>
      </div>

      {/* SƠ ĐỒ 3 TẦNG KAFKA STREAMING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* TẦNG 1: IOT PRODUCER */}
        <div className="lg:col-span-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
            <Activity className="w-4 h-4" /> 1. IoT Sensor Producer
          </div>
          <div className="p-3 bg-slate-950 rounded-lg font-mono text-xs text-slate-300 space-y-1">
            <div className="text-emerald-400 font-bold">Máy #{machineId} (Landmark 81)</div>
            <div>Key: <span className="text-amber-300 font-bold">{`MC-0${machineId}`}</span></div>
            <div>Temp: <span className={status === 'CRITICAL' ? 'text-red-400 font-black' : 'text-cyan-300 font-bold'}>{currentTemp.toFixed(1)}°C</span></div>
            <div>Rate: <span className="text-purple-300 font-bold">5s/batch (MQTT Bridge)</span></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Gom batch Zero-Copy đẩy tuần tự vào Kafka Cluster.
          </p>
        </div>

        {/* MŨI TÊN 1 */}
        <div className="lg:col-span-1 hidden lg:flex justify-center text-slate-500">
          <ArrowRight className="w-6 h-6 animate-pulse text-blue-400" />
        </div>

        {/* TẦNG 2: KAFKA BROKER CLUSTER & PARTITIONS */}
        <div className="lg:col-span-4 bg-slate-800/90 p-4 rounded-xl border border-indigo-500/40 relative">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" /> 2. Kafka Topic Partitioning
            </span>
            <span className="text-[10px] bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded">MurmurHash2</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2 bg-slate-950 rounded border border-indigo-500/30 flex items-center justify-between">
              <span className="text-slate-400">Partition 0 (Key: MC-01)</span>
              <span className="text-emerald-400 font-bold">Offset #1042</span>
            </div>
            <div className="p-2 bg-slate-950/60 rounded border border-slate-700 flex items-center justify-between text-slate-500">
              <span>Partition 1 (Key: MC-02)</span>
              <span>Offset #891</span>
            </div>
            <div className="p-2 bg-slate-950/60 rounded border border-slate-700 flex items-center justify-between text-slate-500">
              <span>Partition 2 (Key: MC-03)</span>
              <span>Offset #530</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Đảm bảo tính tuần tự tuyệt đối theo thời gian của từng máy.
          </p>
        </div>

        {/* MŨI TÊN 2 */}
        <div className="lg:col-span-1 hidden lg:flex justify-center text-slate-500">
          <ArrowRight className="w-6 h-6 animate-pulse text-indigo-400" />
        </div>

        {/* TẦNG 3: 3 CONSUMER GROUPS ĐỘC LẬP */}
        <div className="lg:col-span-3 space-y-2">
          {/* Consumer 1 */}
          <div className="p-2.5 bg-blue-950/60 rounded-xl border border-blue-500/30 flex items-center gap-2.5">
            <MonitorCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-blue-200">CG 1: Realtime Dashboard</div>
              <div className="text-[10px] text-blue-400 font-mono">WebSocket Client STOMP</div>
            </div>
          </div>

          {/* Consumer 2 */}
          <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
            status === 'CRITICAL'
              ? 'bg-red-950 border-red-500 text-red-200 animate-pulse'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
          }`}>
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <div className="font-bold">CG 2: Cold-Chain Alert Engine</div>
              <div className="text-[10px] opacity-80 font-mono">Phát hiện T &gt; 10°C trong 15p</div>
            </div>
          </div>

          {/* Consumer 3 */}
          <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-emerald-200">CG 3: Historical DB Batch</div>
              <div className="text-[10px] text-emerald-400 font-mono">PostgreSQL / TimescaleDB</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
