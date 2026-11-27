import { useRef, useState } from 'react';
import axios from 'axios';
import axiosInstance from '../../../shared/api/axiosInstance';
import { useAuthStore } from '../../auth/authStore';
import type { AddItemRequest, MachineSlot, FruitBatch, RestockItem } from '../types';

interface Draft {
  sessionId: number | null;
  createRequestId?: string;
  items: RestockItem[];
}

const emptyDraft: Draft = { sessionId: null, items: [] };
const sessionsUrl = '/api/v1/restock-sessions';

function readDraft(key: string | null): Draft {
  if (!key) return emptyDraft;
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi khi nạp hàng.';
}

export function useRestockPlan(machineId?: number) {
  const userId = useAuthStore((state) => state.userProfile?.id);
  const key = machineId && userId ? ['fv_restock_draft', userId, machineId].join('_') : null;
  const [state, setState] = useState(() => ({ key, draft: readDraft(key) }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitLock = useRef(false);

  if (state.key !== key) {
    setState({ key, draft: readDraft(key) });
    setError(null);
  }
  const { items, sessionId } = state.draft;

  function saveDraft(draft: Draft) {
    setState({ key, draft });
    if (key) {
      try {
        sessionStorage.setItem(key, JSON.stringify(draft));
      } catch {
        // Keep the draft in memory if browser storage is unavailable.
      }
    }
  }

  function addItem(data: AddItemRequest, slot: MachineSlot, batch: FruitBatch) {
    setError(null);
    const existing = items.find((item) => item.slotId === data.slotId && item.batchId === data.batchId);
    if (existing) {
      saveDraft({ ...state.draft, sessionId, items: items.map((item) => item === existing
        ? { ...item, quantityAdded: item.quantityAdded + data.quantityAdded }
        : item) });
      return;
    }
    saveDraft({ ...state.draft, sessionId, items: [...items, {
      ...data,
      requestId: crypto.randomUUID(),
      slotCode: slot.slotCode,
      productName: slot.productName ?? batch.productName,
      batchCode: batch.batchCode,
    }] });
  }

  function removeItem(slotId: number, batchId: number) {
    saveDraft({ ...state.draft, sessionId, items: items.filter((item) => item.slotId !== slotId || item.batchId !== batchId) });
  }

  async function completePlan(): Promise<boolean> {
    if (submitLock.current) return false;
    if (!machineId || (items.length === 0 && sessionId === null)) {
      setError('Cần ít nhất một lô hàng trong danh sách trước khi xác nhận nạp.');
      return false;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const requestId = state.draft.createRequestId ?? crypto.randomUUID();
      saveDraft({ sessionId, createRequestId: requestId, items });
      const id = sessionId ?? (await axiosInstance.post<{ id: number }>(
        sessionsUrl, { machineId, requestId }
      )).data.id;
      saveDraft({ sessionId: id, items });
      const sessionUrl = sessionsUrl + '/' + id;
      for (const [index, item] of items.entries()) {
        try {
          await axiosInstance.post(sessionUrl + '/items', {
            slotId: item.slotId,
            batchId: item.batchId,
            quantityAdded: item.quantityAdded,
            requestId: item.requestId,
          });
        } catch (requestError: unknown) {
          throw new Error(
            'Khay ' + item.slotCode + ' (lô ' + item.batchCode + '): ' + getErrorMessage(requestError),
            { cause: requestError }
          );
        }
        saveDraft({ sessionId: id, items: items.slice(index + 1) });
      }
      await axiosInstance.post(sessionUrl + '/complete');
      saveDraft(emptyDraft);
      return true;
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  return { items, isSubmitting, error, addItem, removeItem, completePlan, hasPendingSession: sessionId !== null };
}
