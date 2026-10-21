
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import MachineSlotGrid from "../components/MachineSlotGrid";
import SlotConfigModal from "../components/SlotConfigModal";
import { getMachineSlots } from "../services/slotService";
import type { MachineSlot } from "../slotTypes";

import "../slots.css";

export default function MachineSlotsPage() {
  const { machineId } = useParams<{ machineId: string }>();

  const [slots, setSlots] = useState<MachineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<MachineSlot | null>(null);

  const loadSlots = useCallback(async () => {
    const id = Number(machineId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      setError("Mã máy không hợp lệ.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getMachineSlots(id);
      setSlots(data);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ??
          "Không thể tải danh sách khay từ Backend."
        : "Đã xảy ra lỗi không xác định.";

      setError(String(message));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  useEffect(() => {
    void loadSlots().catch(() => {});
  }, [loadSlots]);

  return (
    <div className="fv-slots-page">
      <Link to="/admin/machines" className="fv-slot-back">
        ← Quay lại danh sách máy
      </Link>

      <div className="fv-slots-heading">
        <div>
          <h1>Quản lý khay hàng</h1>
          <p>Máy #{machineId}</p>
        </div>
      </div>

      {loading ? (
        <p>Đang tải danh sách khay...</p>
      ) : error ? (
        <p role="alert" className="fv-slot-error">
          {error}
        </p>
      ) : (
        <MachineSlotGrid
          slots={slots}
          onConfigure={setSelectedSlot}
        />
      )}

      {selectedSlot && (
        <SlotConfigModal
          key={selectedSlot.slotId}
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSaved={loadSlots}
        />
      )}
    </div>
  );
}
