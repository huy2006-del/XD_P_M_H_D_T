import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AlertItem, MachineStatusValue } from './alertService';
import { alertService } from './alertService';

interface ResolveAlertModalProps {
  alertItem: AlertItem | null;
  currentMachineStatus?: MachineStatusValue | string;
  onClose: () => void;
  onSuccess: (resolvedAlert: AlertItem, updatedMachineStatus?: MachineStatusValue) => void;
}

const MACHINE_STATUS_OPTIONS: Array<{ value: MachineStatusValue; label: string }> = [
  { value: 'ONLINE', label: 'ONLINE — Đưa máy hoạt động trở lại' },
  { value: 'MAINTENANCE', label: 'MAINTENANCE — Chuyển sang bảo trì' },
  { value: 'OFFLINE', label: 'OFFLINE — Tạm ngắt kết nối' },
  { value: 'OUT_OF_ORDER', label: 'OUT_OF_ORDER — Giữ trạng thái ngừng hoạt động' },
];

export const ResolveAlertModal: React.FC<ResolveAlertModalProps> = ({
  alertItem,
  currentMachineStatus,
  onClose,
  onSuccess,
}) => {
  const [notes, setNotes] = useState('');
  const [shouldUpdateMachine, setShouldUpdateMachine] = useState(false);
  const [targetMachineStatus, setTargetMachineStatus] = useState<MachineStatusValue>('ONLINE');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!alertItem) return;
    setNotes('');
    setValidationError('');
    const shouldSuggestRestore =
      currentMachineStatus === 'OUT_OF_ORDER' ||
      currentMachineStatus === 'ERROR' ||
      alertItem.severity === 'CRITICAL';
    setShouldUpdateMachine(shouldSuggestRestore);
    setTargetMachineStatus('ONLINE');
  }, [alertItem, currentMachineStatus]);

  if (!alertItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = notes.trim();
    if (!trimmed) {
      setValidationError('Backend bắt buộc phải có ghi chú khắc phục trước khi đóng cảnh báo.');
      return;
    }

    try {
      setSubmitting(true);
      setValidationError('');

      const resolvedAlert = await alertService.resolveAlert(alertItem.id, trimmed);

      let appliedMachineStatus: MachineStatusValue | undefined;
      if (shouldUpdateMachine) {
        try {
          await alertService.updateMachineStatus(alertItem.machineId, targetMachineStatus);
          appliedMachineStatus = targetMachineStatus;
        } catch (statusError) {
          console.error('Đã đóng cảnh báo nhưng chưa cập nhật được trạng thái máy:', statusError);
          toast.warning(
            `Đã đóng cảnh báo #${alertItem.id}, nhưng không thể đổi trạng thái máy #${alertItem.machineId}.`
          );
        }
      }

      onSuccess(resolvedAlert, appliedMachineStatus);
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Lỗi khi xử lý sự cố:', error);
      setValidationError('Không thể đóng cảnh báo. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-gray-900">
            Đóng cảnh báo #{alertItem.id}
          </h3>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              alertItem.severity === 'CRITICAL'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {alertItem.severity}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-1">
          Máy #{alertItem.machineId} • Trạng thái hiện tại: <strong>{alertItem.status}</strong>
        </p>
        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
          {alertItem.message}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú khắc phục <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (validationError) setValidationError('');
              }}
              placeholder="Ví dụ: Đã kiểm tra máy nén, nhiệt độ ổn định ở 4.5°C, khôi phục máy hoạt động..."
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Bắt buộc theo yêu cầu Backend (tối đa 2000 ký tự).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 space-y-2.5">
            <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={shouldUpdateMachine}
                onChange={(e) => setShouldUpdateMachine(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Đồng thời cập nhật trạng thái <strong>Máy #{alertItem.machineId}</strong>
                {currentMachineStatus ? ` (hiện tại: ${currentMachineStatus})` : ''}
              </span>
            </label>

            {shouldUpdateMachine && (
              <select
                value={targetMachineStatus}
                onChange={(e) => setTargetMachineStatus(e.target.value as MachineStatusValue)}
                className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MACHINE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {validationError && (
            <p role="alert" className="text-xs text-red-600 font-medium">
              {validationError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !notes.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
            >
              {submitting ? 'Đang lưu...' : 'Hoàn tất xử lý'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};