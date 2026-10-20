import React from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { ProductSlot } from '../../../types/kiosk';

interface KioskDetailModalProps {
  activeSlot: ProductSlot;
  txStatus: 'IDLE' | 'SUCCESS' | 'ERROR';
  feedbackMessage: string;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const KioskDetailModal: React.FC<KioskDetailModalProps> = ({
  activeSlot,
  txStatus,
  feedbackMessage,
  isProcessing,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Modal Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center space-x-2 mb-4">
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black">
            Khay {activeSlot.slotCode}
          </span>
          <h2 className="text-xl font-black text-white">Xác Nhận Đơn Hàng</h2>
        </div>

        {/* Modal Body */}
        <div className="space-y-4">
          <div className="h-48 w-full rounded-2xl overflow-hidden bg-slate-950">
            <img
              src={activeSlot.imageUrl}
              alt={activeSlot.productName}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h3 className="text-2xl font-black text-white">{activeSlot.productName}</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">{activeSlot.description}</p>
          </div>

          {/* FIFO Batch Info Notice */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Đơn giá</span>
              <span className="text-xl font-black text-emerald-400">{activeSlot.price.toLocaleString('vi-VN')} VNĐ</span>
            </div>
            {activeSlot.batchInfo && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-900 text-xs">
                <span className="text-slate-500">Mô phỏng kho (FIFO):</span>
                <span className="text-teal-300 font-mono font-bold">{activeSlot.batchInfo}</span>
              </div>
            )}
          </div>

          {/* Status Alert Messages */}
          {txStatus === 'SUCCESS' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-200 font-medium leading-snug">{feedbackMessage}</p>
            </div>
          )}

          {txStatus === 'ERROR' && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200 font-medium leading-snug">{feedbackMessage}</p>
            </div>
          )}

          {/* Modal Buttons */}
          <div className="pt-2 flex space-x-3">
            {txStatus === 'SUCCESS' ? (
              <button
                onClick={onClose}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl tracking-wider transition cursor-pointer"
              >
                HOÀN TẤT & ĐÓNG
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition cursor-pointer"
                >
                  HỦY BỎ
                </button>
                <button
                  disabled={isProcessing}
                  onClick={onConfirm}
                  className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>ĐANG TRỪ KHO FIFO...</span>
                    </>
                  ) : (
                    <span>XÁC NHẬN MUA</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
