import React, { useState } from 'react';
import type { AlertItem } from './alertService';
import { alertService } from './alertService';

interface ResolveAlertModalProps {
  alertItem: AlertItem | null;
  onClose: () => void;
  onSuccess: (resolvedId: number) => void;
}

export const ResolveAlertModal: React.FC<ResolveAlertModalProps> = ({
  alertItem,
  onClose,
  onSuccess,
}) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!alertItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    try {
      setSubmitting(true);
      await alertService.resolveAlert(alertItem.id, notes);
      onSuccess(alertItem.id);
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Lỗi khi xử lý sự cố:', error);
      alert('Không thể cập nhật trạng thái cảnh báo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Xác nhận đã xử lý sự cố #{alertItem.id}
        </h3>
        <p className="text-sm text-gray-600 mb-4">{alertItem.message}</p>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ghi chú khắc phục
          </label>
          <textarea
            required
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Đã đóng lại cánh tủ, kiểm tra máy nén bình thường..."
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
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