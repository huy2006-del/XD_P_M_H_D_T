import { useRef, useState } from 'react';
import axios from 'axios';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { AddItemRequest, MachineSlot, FruitBatch, RestockItem } from '../types';

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định khi nạp hàng.';
}

export function useRestockPlan() {
  const [items, setItems] = useState<RestockItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitLock = useRef(false);

  function resetPlan() {
    setItems([]);
    setError(null);
  }

  function addItem(data: AddItemRequest, slot: MachineSlot, batch: FruitBatch) {
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

  function removeItem(slotId: number, batchId: number) {
    setItems((currentItems) =>
      currentItems.filter((i) => !(i.slotId === slotId && i.batchId === batchId))
    );
  }

  async function completePlan(): Promise<boolean> {
    if (submitLock.current || isSubmitting) return false;

    if (items.length === 0) {
      setError('Cần ít nhất một lô hàng trong danh sách trước khi xác nhận nạp.');
      return false;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setError(null);

    let loadedCount = 0;
    const totalToLoad = items.length;

    try {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        try {
          await axiosInstance.post(`/api/v1/slots/${item.slotId}/batches`, {
            batchId: item.batchId,
            quantity: item.quantityAdded,
          });
          loadedCount += 1;
        } catch (requestError: unknown) {
          const detail = getErrorMessage(requestError);
          const progressMsg =
            loadedCount > 0
              ? `Đã nạp thành công ${loadedCount}/${totalToLoad} mục trước đó. `
              : '';
          throw new Error(
            `${progressMsg}Lỗi tại khay ${item.slotCode} (lô ${item.batchCode}): ${detail}`,
            { cause: requestError }
          );
        }
      }

      // Xóa các item đã hoàn thành
      setItems([]);
      return true;
    } catch (requestError: unknown) {
      // Endpoint nạp từng khay riêng lẻ: giữ lại đúng phần chưa gửi để retry
      // không nạp lần hai những mục đã được backend áp dụng.
      if (loadedCount > 0) {
        setItems((current) => current.slice(loadedCount));
      }
      const message = getErrorMessage(requestError);
      setError(message);
      return false;
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  return { items, isSubmitting, error, addItem, removeItem, completePlan, resetPlan };
}
