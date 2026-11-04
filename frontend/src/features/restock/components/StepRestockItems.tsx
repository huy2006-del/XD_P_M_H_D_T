import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import axiosInstance from "../../../shared/api/axiosInstance";
import type { PaginatedResponse } from "../../../shared/types/common.types";
import type {
  AddItemRequest,
  FruitBatch,
  MachineSlot,
  RestockItem,
} from "../types";

interface Props {
  selectedSlot: MachineSlot;
  sessionItems: RestockItem[];
  onAddItem: (
    data: AddItemRequest,
    slot: MachineSlot,
    batch: FruitBatch
  ) => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return error instanceof Error ? error.message : "Không thể tải danh sách lô.";
}

export const StepRestockItems: React.FC<Props> = ({
  selectedSlot,
  sessionItems,
  onAddItem,
}) => {
  const [batches, setBatches] = useState<FruitBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let active = true;

    axiosInstance
      .get<PaginatedResponse<FruitBatch>>("/api/v1/batches", {
        params: {
          productId: selectedSlot.productId,
          expired: false,
          page: 0,
          size: 100,
        },
      })
      .then(({ data }) => {
        if (active) {
          setBatches(
            data.content.filter(
              (batch) =>
                !batch.expired &&
                batch.quantityRemaining > 0 &&
                batch.productId === selectedSlot.productId
            )
          );
        }
      })
      .catch((requestError: unknown) => {
        if (active) setErrorMsg(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingBatches(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSlot.productId]);

  const itemsForSlot = sessionItems.filter(
    (item) => item.slotId === selectedSlot.slotId
  );
  const currentAdded = itemsForSlot.reduce(
    (sum, item) => sum + item.quantityAdded,
    0
  );
  const maxCanAdd = Math.max(
    0,
    selectedSlot.capacity - selectedSlot.currentStock - currentAdded
  );
  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id) === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  );
  const pendingForBatch = sessionItems
    .filter((item) => item.batchId === selectedBatch?.id)
    .reduce((sum, item) => sum + item.quantityAdded, 0);
  const maxForSelectedBatch = Math.min(
    maxCanAdd,
    Math.max(0, (selectedBatch?.quantityRemaining ?? 0) - pendingForBatch)
  );

  async function handleAdd() {
    setErrorMsg("");
    if (!selectedBatch) {
      setErrorMsg("Vui lòng chọn lô hàng.");
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setErrorMsg("Số lượng phải là số nguyên lớn hơn 0.");
      return;
    }
    if (quantity > maxForSelectedBatch) {
      setErrorMsg(`Số lượng tối đa có thể thêm là ${maxForSelectedBatch}.`);
      return;
    }

    setIsAdding(true);
    try {
      await onAddItem(
        {
          slotId: selectedSlot.slotId,
          batchId: selectedBatch.id,
          quantityAdded: quantity,
        },
        selectedSlot,
        selectedBatch
      );
      setQuantity(1);
      setSelectedBatchId("");
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error ? error.message : "Không thể thêm lô vào kế hoạch."
      );
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">
        Bước 3: Lập kế hoạch nạp khay {selectedSlot.slotCode}
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        Hàng chỉ được ghi vào kho sau khi bạn xác nhận ở bước tiếp theo.
      </p>

      {errorMsg && (
        <p role="alert" className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <div className="mb-6 rounded-lg border bg-gray-50 p-4">
        {loadingBatches ? (
          <p>Đang tải lô hàng...</p>
        ) : (
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="restock-batch"
              >
                Chọn lô hàng
              </label>
              <select
                id="restock-batch"
                className="w-full rounded border p-2"
                value={selectedBatchId}
                onChange={(event) => {
                  setSelectedBatchId(event.target.value);
                  setQuantity(1);
                }}
                disabled={batches.length === 0}
              >
                <option value="">-- Chọn lô --</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchCode} · HSD {batch.expiryDate} · còn{" "}
                    {batch.quantityRemaining}
                  </option>
                ))}
              </select>
              {batches.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Không có lô còn hạn và tồn kho cho sản phẩm của khay.
                </p>
              )}
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="restock-quantity"
              >
                Số lượng (tối đa {maxForSelectedBatch})
              </label>
              <input
                id="restock-quantity"
                type="number"
                min={1}
                max={maxForSelectedBatch}
                step={1}
                className="w-full rounded border p-2"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                disabled={!selectedBatch || maxForSelectedBatch === 0}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={
                isAdding ||
                loadingBatches ||
                !selectedBatch ||
                maxForSelectedBatch === 0
              }
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isAdding ? "Đang thêm..." : "Thêm vào kế hoạch"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="mb-2 font-medium">Kế hoạch nạp hàng</h3>
        {sessionItems.length === 0 ? (
          <p className="text-sm italic text-gray-500">Chưa có mục nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Khay</th>
                  <th className="border p-2">Sản phẩm</th>
                  <th className="border p-2">Lô hàng</th>
                  <th className="border p-2 text-right">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {sessionItems.map((item) => (
                  <tr
                    key={`${item.slotId}-${item.batchId}`}
                    className="border-b"
                  >
                    <td className="border p-2 font-bold">{item.slotCode}</td>
                    <td className="border p-2">{item.productName}</td>
                    <td className="border p-2">{item.batchCode}</td>
                    <td className="border p-2 text-right font-bold text-green-600">
                      +{item.quantityAdded}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
