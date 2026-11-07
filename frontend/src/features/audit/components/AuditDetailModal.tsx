import React from 'react';
import { X, Clock, User, Shield, FileText } from 'lucide-react';
import type { AuditLogItem } from '../types';

interface Props {
  log: AuditLogItem | null;
  onClose: () => void;
}

export const AuditDetailModal: React.FC<Props> = ({ log, onClose }) => {
  if (!log) return null;

  // Thử parse details thành JSON nếu có
  let formattedDetails: string = log.details || 'Không có thông tin chi tiết.';
  try {
    if (log.details) {
      const parsed = JSON.parse(log.details);
      formattedDetails = JSON.stringify(parsed, null, 2);
    }
  } catch {
    formattedDetails = log.details || '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">Chi Tiết Nhật Ký Hệ Thống</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Người thực hiện:</span>
              <span className="font-bold text-gray-900">{log.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Thời điểm:</span>
              <span className="font-medium text-gray-700">
                {new Date(log.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hành động</span>
            <div className="mt-1">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-full border border-blue-200">
                {log.action}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5" />
              Nội dung thay đổi (Payload Details)
            </div>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
              {formattedDetails}
            </pre>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};