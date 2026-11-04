import { useState } from "react";
import axios from "axios";
import axiosInstance from "../../../shared/api/axiosInstance";
import type { AddItemRequest, MachineSlot, FruitBatch, RestockItem } from "../types";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
}

export function useRestockPlan() {
  const [items, setItems] = useState<RestockItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetPlan() {
    setItems([]);
    setError(null);
  }

  function addItem(
    data: AddItemRequest,
    slot: MachineSlot,
    batch: FruitBatch
  ) {
    setError(null);
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.slotId === data.slotId && item.batchId === data.batchId
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item === existingItem
            ? {
                ...item,
                quantityAdded: item.quantityAdded + data.quantityAdded,
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          ...data,
          slotCode: slot.slotCode,
          productName: slot.productName ?? batch.productName,
          batchCode: batch.batchCode,
        },
      ];
    });
  }

  async function completePlan(): Promise<boolean> {
    if (isSubmitting) return false;

    if (items.length === 0) {
      setError("Thêm ít nhất một lô hàng trước khi xác nhận.");
      return false;
    }

    setIsSubmitting(true);
    setError(null);

    let loadedCount = 0;

    try {
      for (const item of items) {
        try {
          await axiosInstance.post(
            `/api/v1/slots/${item.slotId}/batches`,
            {
              batchId: item.batchId,
              quantity: item.quantityAdded,
            }
          );
          loadedCount += 1;
          setItems((remainingItems) =>
            remainingItems.filter(
              (remainingItem) =>
                remainingItem.slotId !== item.slotId ||
                remainingItem.batchId !== item.batchId
            )
          );
        } catch (requestError: unknown) {
          const progress =
            loadedCount > 0
              ? `Đã nạp thành công ${loadedCount} mục trước đó. `
              : "";
          throw new Error(
            `${progress}Không thể nạp lô ${item.batchCode} vào khay ${item.slotCode}: ${getErrorMessage(requestError)}`,
            { cause: requestError }
          );
        }
      }
      return true;
    } catch (requestError: unknown) {
      const message = getErrorMessage(requestError);
      setError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { items, isSubmitting, error, addItem, completePlan, resetPlan };
}
