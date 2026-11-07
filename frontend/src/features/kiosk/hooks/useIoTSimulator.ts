import { useState, useEffect } from 'react';

// Cấu trúc gói tin theo đúng thiết kế
export interface IoTTelemetryPayload {
  machineId: string;
  idempotencyKey: string;
  timestamp: number;
  payload: { T: number; H: number };
}

export const useIoTSimulator = (machineId: string = 'MC-LANDMARK-01') => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [temperature, setTemperature] = useState<number>(4.0);
  const [motorActive, setMotorActive] = useState<boolean>(true);
  const [offlineBuffer, setOfflineBuffer] = useState<IoTTelemetryPayload[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Hàm thêm log để hiển thị ra Terminal của Secret Panel
  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  };

  // 1. CƠ CHẾ HARDWARE WATCHDOG
  useEffect(() => {
    if (!isOnline && temperature > 10) {
      addLog("⚠️ CẢNH BÁO: Rớt mạng & Nhiệt độ > 10°C!");
      const timer = setTimeout(() => {
        setMotorActive(false);
        addLog("🛑 HARDWARE WATCHDOG: Đã ngắt motor máy nén sau 3s để bảo vệ!");
      }, 3000);
      return () => clearTimeout(timer);
    } else if (!motorActive && temperature <= 10) {
      setMotorActive(true);
      addLog("✅ Motor máy nén hoạt động trở lại.");
    }
  }, [temperature, isOnline, motorActive]);

  // 2. VÒNG LẶP THU THẬP DỮ LIỆU (5s/lần) & CƠ CHẾ ĐỒNG BỘ
  useEffect(() => {
    const interval = setInterval(() => {
      const telemetry: IoTTelemetryPayload = {
        machineId,
        idempotencyKey: crypto.randomUUID(), // Khóa Idempotency chống trùng lặp
        timestamp: Date.now(),
        payload: { T: temperature, H: 85 } // Độ ẩm fix cứng 85% cho demo
      };

      if (isOnline) {
        // CƠ CHẾ TWO-PHASE RECONCILIATION KHI CÓ MẠNG LẠI
        if (offlineBuffer.length > 0) {
          addLog(`🔄 Phase 1: Gửi bản nháp đối chiếu Server cho ${offlineBuffer.length} gói tin...`);
          setTimeout(() => {
            addLog(`🚀 Phase 2: Đã đồng bộ lô dữ liệu cũ lên Kafka. Idempotency Key OK!`);
            setOfflineBuffer([]); // Xóa buffer sau khi gửi bù xong
          }, 1500);
        } else {
          // Gửi bình thường
          addLog(`📡 [MQTT -> KAFKA] Đã phát gói tin: { T: ${temperature}°C, H: 85% }`);
        }
      } else {
        // CƠ CHẾ STORE-AND-FORWARD KHI MẤT MẠNG
        setOfflineBuffer((prev) => [...prev, telemetry]);
        addLog(`💾 [OFFLINE] Lưu vào thẻ nhớ (Store & Forward). Đang nợ: ${offlineBuffer.length + 1} gói`);
      }
    }, 5000); // Đều đặn 5s/lần

    return () => clearInterval(interval);
  }, [isOnline, temperature, offlineBuffer]);

  return {
    isOnline, setIsOnline,
    temperature, setTemperature,
    motorActive, offlineBuffer, logs
  };
};