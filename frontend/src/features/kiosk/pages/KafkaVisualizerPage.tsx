import React, { useReducer, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Database, Activity, RefreshCw, Send, HardDrive } from 'lucide-react';

// ==========================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (OOD TYPE DEFINITIONS)
// ==========================================
interface KafkaMessage {
  id: string;
  machineId: string;
  offset: number;
  data: string;
}

interface Partition {
  id: number;
  messages: KafkaMessage[];
  latestOffset: number;
}

interface ConsumerGroup {
  id: string;
  name: string;
  icon: React.ElementType;
  pullSpeedMs: number; // Tốc độ tiêu thụ dữ liệu (Mô phỏng Pull)
  currentOffsets: Record<number, number>; // Lưu vị trí offset đang đọc cho từng Partition
}

interface KafkaState {
  partitions: Partition[];
  consumerGroups: ConsumerGroup[];
}

// ==========================================
// 2. KHỞI TẠO STATE & REDUCER (CORE LOGIC)
// ==========================================
const initialState: KafkaState = {
  partitions: [
    { id: 0, messages: [], latestOffset: 0 },
    { id: 1, messages: [], latestOffset: 0 },
    { id: 2, messages: [], latestOffset: 0 },
  ],
  consumerGroups: [
    { id: 'cg1', name: 'Realtime Dashboard', icon: Activity, pullSpeedMs: 800, currentOffsets: { 0: 0, 1: 0, 2: 0 } },
    { id: 'cg2', name: 'Alert Engine', icon: Server, pullSpeedMs: 1200, currentOffsets: { 0: 0, 1: 0, 2: 0 } },
    { id: 'cg3', name: 'Data Warehouse (Batch)', icon: Database, pullSpeedMs: 3000, currentOffsets: { 0: 0, 1: 0, 2: 0 } },
  ],
};

type KafkaAction =
  | { type: 'PRODUCE_MESSAGE'; machineId: string; data: string }
  | { type: 'CONSUME_DATA'; groupId: string }
  | { type: 'REPLAY'; groupId: string };

// Giả lập hàm Băm (Hash) để định tuyến tĩnh
const getPartitionKey = (machineId: string): number => {
  if (machineId === 'MC-01') return 0; // Landmark 81 -> Luôn vào P0
  if (machineId === 'MC-02') return 1; // Bitexco -> Luôn vào P1
  return 2;                            // Vincom -> Luôn vào P2
};

const kafkaReducer = (state: KafkaState, action: KafkaAction): KafkaState => {
  switch (action.type) {
    case 'PRODUCE_MESSAGE': {
      const partitionId = getPartitionKey(action.machineId);
      return {
        ...state,
        partitions: state.partitions.map((p) => {
          if (p.id !== partitionId) return p;
          const newOffset = p.latestOffset;
          const newMessage: KafkaMessage = {
            id: `${Date.now()}-${Math.random()}`,
            machineId: action.machineId,
            offset: newOffset,
            data: action.data,
          };
          return {
            ...p,
            messages: [...p.messages, newMessage],
            latestOffset: newOffset + 1,
          };
        }),
      };
    }

    case 'CONSUME_DATA': {
      // Logic để Consumer chủ động Kéo (Pull) dữ liệu
      return {
        ...state,
        consumerGroups: state.consumerGroups.map((cg) => {
          if (cg.id !== action.groupId) return cg;
          const newOffsets = { ...cg.currentOffsets };
          let hasUpdated = false;

          // Quét qua các partition, nếu offset hiện tại < latestOffset thì tăng lên 1 (đọc thêm 1 tin)
          state.partitions.forEach((p) => {
            if (newOffsets[p.id] < p.latestOffset) {
              newOffsets[p.id] += 1;
              hasUpdated = true;
            }
          });

          return hasUpdated ? { ...cg, currentOffsets: newOffsets } : cg;
        }),
      };
    }

    case 'REPLAY': {
      // Logic tua lại thời gian (Reset offset về 0)
      return {
        ...state,
        consumerGroups: state.consumerGroups.map((cg) => {
          if (cg.id !== action.groupId) return cg;
          return { ...cg, currentOffsets: { 0: 0, 1: 0, 2: 0 } };
        }),
      };
    }

    default:
      return state;
  }
};

// ==========================================
// 3. MAIN COMPONENT (GIAO DIỆN)
// ==========================================
export const KafkaVisualizerPage: React.FC = () => {
  const [state, dispatch] = useReducer(kafkaReducer, initialState);
  const [selectedMachine, setSelectedMachine] = useState('MC-01');

  // Hook giả lập các Consumer Group liên tục Pull dữ liệu ngầm
  useEffect(() => {
    const intervals = initialState.consumerGroups.map((cg) => {
      return setInterval(() => {
        dispatch({ type: 'CONSUME_DATA', groupId: cg.id });
      }, cg.pullSpeedMs);
    });
    return () => intervals.forEach(clearInterval);
  }, []); // Chạy 1 lần lúc mount

  const handleProduce = () => {
    dispatch({ type: 'PRODUCE_MESSAGE', machineId: selectedMachine, data: 'Temp: 4.5°C' });
  };

  const handleReplay = (groupId: string) => {
    dispatch({ type: 'REPLAY', groupId });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            KAFKA ARCHITECTURE VISUALIZER
          </h1>
          <p className="text-slate-400">Mô phỏng lõi Kafka Broker, Partition Hashing & Consumer Group Replay</p>
        </header>

        {/* --- TẦNG 1: PRODUCER (IOT DEVICES) --- */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5" /> Tầng 1: Producers (Nguồn phát)
          </h2>
          <div className="flex gap-4 items-center">
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="MC-01">Kiosk Landmark 81 (Hash: 0)</option>
              <option value="MC-02">Kiosk Bitexco (Hash: 1)</option>
              <option value="MC-03">Kiosk Vincom (Hash: 2)</option>
            </select>
            <button
              onClick={handleProduce}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-900/50"
            >
              <Send className="w-4 h-4" /> Send Event
            </button>
          </div>
        </section>

        {/* --- TẦNG 2: KAFKA BROKER & PARTITIONS --- */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-orange-400 mb-2 flex items-center gap-2">
            <Server className="w-5 h-5" /> Tầng 2: Kafka Broker (Topic: machine-telemetry)
          </h2>
          
          {state.partitions.map((partition) => (
            <div key={partition.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex gap-4 overflow-x-hidden relative">
              <div className="flex-shrink-0 w-32 border-r border-slate-700 flex flex-col justify-center">
                <span className="font-bold text-slate-300">Partition {partition.id}</span>
                <span className="text-xs text-slate-500">Latest Offset: {partition.latestOffset}</span>
              </div>
              
              {/* Vùng hiển thị các Messages (Append-Only) */}
              <div className="flex-1 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {partition.messages.length === 0 && (
                    <div className="text-slate-600 italic text-sm py-2">Đang chờ dữ liệu...</div>
                  )}
                  {partition.messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -50, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      className="flex-shrink-0 bg-slate-800 border border-slate-600 p-3 rounded-lg shadow-md min-w-[140px]"
                    >
                      <div className="text-xs font-mono text-orange-400 mb-1 font-bold">Offset: {msg.offset}</div>
                      <div className="text-sm font-bold text-white">{msg.machineId}</div>
                      <div className="text-xs text-slate-400">{msg.data}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </section>

        {/* --- TẦNG 3: CONSUMER GROUPS --- */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
              <Database className="w-5 h-5" /> Tầng 3: Consumer Groups (Độc lập)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {state.consumerGroups.map((cg) => {
              const Icon = cg.icon;
              return (
                <div key={cg.id} className="bg-slate-900 border border-slate-700 rounded-xl p-5 relative overflow-hidden group">
                  {/* Hiệu ứng tia sáng chạy ngang */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-900/50 rounded-lg text-purple-400">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{cg.name}</h3>
                        <p className="text-xs text-slate-400">Speed: {cg.pullSpeedMs}ms</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">Current Pointers:</div>
                    {[0, 1, 2].map(pId => (
                      <div key={pId} className="flex justify-between text-sm bg-slate-800 px-3 py-1.5 rounded border border-slate-700">
                        <span className="text-slate-400">Partition {pId}:</span>
                        <span className="font-mono text-emerald-400 font-bold">Offset {cg.currentOffsets[pId]}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleReplay(cg.id)}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-purple-500/30 text-purple-400 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Rewind (Replay)
                  </button>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};
