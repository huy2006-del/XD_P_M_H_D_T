import React, { useEffect, useState } from "react";
import axios from "axios";
import axiosInstance from "../../../shared/api/axiosInstance";
import type { MachineSlot } from "../types";

interface Props {
  machineId: number;
  onSlotSelected: (slot: MachineSlot) => void;
}

export const StepSelectSlot: React.FC<Props> = ({
  machineId,
  onSlotSelected,
}) => {
  const [slots, setSlots] = useState<MachineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    axiosInstance
      .get<MachineSlot[]>(`/api/v1/machines/${machineId}/slots`)
      .then(({ data }) => {
        if (active) setSlots(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            axios.isAxiosError<{ message?: string }>(requestError)
              ? requestError.response?.data?.message ?? requestError.message
              : "Không thể tải sơ đồ khay."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [machineId]);

  if (loading) {
    return <div className="p-4 text-center">Đang tải sơ đồ khay...</div>;
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">
        Bước 2: Chọn khay cần nạp hàng
      </h2>
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {slots.map((slot) => {
          const isFull = slot.currentStock >= slot.capacity;
          const isUnconfigured = slot.productId === null;
          const isJammed = slot.status === "JAMMED";
          const isUnavailable = isFull || isUnconfigured || isJammed;
          const stockPercent =
            slot.capacity > 0
              ? Math.min(100, (slot.currentStock / slot.capacity) * 100)
              : 0;
          const isLowStock = !isUnconfigured && slot.capacity > 0 && (slot.currentStock <= 2 || stockPercent <= 20);

          return (
            <button
              type="button"
              key={slot.slotId}
              disabled={isUnavailable}
              onClick={() => onSlotSelected(slot)}
              className={`relative rounded-lg border p-3 text-left transition ${
                isUnavailable
                  ? "cursor-not-allowed bg-gray-100 opacity-60"
                  : "bg-white shadow-sm hover:border-blue-500"
              }`}
            >
              <div className="mb-1 flex justify-between font-bold">
                <span>{slot.slotCode}</span>
                <span className="text-sm text-gray-500">
                  {slot.currentStock}/{slot.capacity}
                </span>
              </div>
              <p className="truncate text-sm text-gray-700">
                {slot.productName ?? "Chưa gán sản phẩm"}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">{slot.status}</p>
                {isLowStock && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Tồn thấp</span>}
              </div>
              <div className="mt-3 h-2 w-full rounded bg-gray-200">
                <div
                  className={`h-2 rounded ${
                    stockPercent === 100
                      ? "bg-red-500"
                      : stockPercent < 20
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${stockPercent}%` }}
                />
              </div>
              {isUnavailable && (
                <span className="mt-2 block text-xs font-semibold text-gray-600">
                  {isFull
                    ? "Đã đầy"
                    : isJammed
                      ? "Khay đang bị kẹt"
                      : "Cần gán sản phẩm"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!error && slots.length === 0 && (
        <p className="py-6 text-center text-gray-500">Máy chưa có khay hàng.</p>
      )}
    </div>
  );
};
