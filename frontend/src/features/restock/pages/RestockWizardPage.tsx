import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRestockPlan } from '../hooks/useRestockPlan';
import { StepSelectMachine } from '../components/StepSelectMachine';
import { StepSelectSlot } from '../components/StepSelectSlot';
import { StepRestockItems } from '../components/StepRestockItems';
import { StepConfirmation } from '../components/StepConfirmation';
import type { Machine, MachineSlot } from '../types';
import { ArrowLeft, ArrowRight, Check, History, Layers } from 'lucide-react';

const STEPS = [
  { title: 'Chọn máy', desc: 'Chọn máy cần tiếp hàng' },
  { title: 'Chọn khay', desc: 'Sơ đồ sức chứa khay' },
  { title: 'Lập kế hoạch', desc: 'Chọn lô hàng & số lượng' },
  { title: 'Xác nhận nạp', desc: 'Cập nhật kho & hoàn tất' },
];

export const RestockWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/operator';
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<MachineSlot | null>(null);

  const { items, isSubmitting, error, addItem, removeItem, completePlan, hasPendingSession } = useRestockPlan(selectedMachine?.id);

  const handleMachineSelect = (machine: Machine) => {
    setSelectedMachine(machine);
    setSelectedSlot(null);
    setCurrentStep(1);
  };

  const handleSlotSelect = (slot: MachineSlot) => {
    setSelectedSlot(slot);
    setCurrentStep(2);
  };

  const handleComplete = async () => {
    const completed = await completePlan();
    if (!completed) return;

    toast.success('Đã nạp hàng thành công! Tồn kho khay đã được cập nhật.');
    navigate(`${basePath}/restock/history`, { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header và nút điều hướng lịch sử */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tiếp Hàng Vào Máy Bán (Restock Wizard)</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quy trình tiếp hàng 4 bước tuân thủ FEFO và cập nhật thời gian thực.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`${basePath}/restock/history`)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <History className="w-4 h-4 text-gray-500" />
          <span>Xem Lịch Sử Nạp</span>
        </button>
      </div>

      {/* Thanh tiến trình Steps */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
          {STEPS.map((s, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div key={idx} className="flex items-center gap-3 relative z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-md'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="overflow-hidden">
                  <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-blue-600' : 'text-gray-700'}`}>
                    {s.title}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thông tin ngữ cảnh máy & khay đang chọn */}
      {selectedMachine && currentStep > 0 && (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Đang tiếp hàng cho: <strong>{selectedMachine.name}</strong> ({selectedMachine.serialNumber})</span>
            {selectedSlot && (
              <>
                <span>•</span>
                <span>Khay: <strong className="font-mono text-blue-700">{selectedSlot.slotCode}</strong> ({selectedSlot.productName})</span>
              </>
            )}
          </div>

          {currentStep === 2 && (
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              Đổi khay khác
            </button>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Khung nội dung chính */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[420px]">
        {currentStep === 0 && <StepSelectMachine onSelect={handleMachineSelect} />}

        {currentStep === 1 && selectedMachine && (
          <StepSelectSlot machineId={selectedMachine.id} onSlotSelected={handleSlotSelect} />
        )}

        {currentStep === 2 && selectedSlot && (
          <StepRestockItems
            selectedSlot={selectedSlot}
            sessionItems={items}
            onAddItem={async (data, slot, batch) => {
              addItem(data, slot, batch);
            }}
            onRemoveItem={removeItem}
          />
        )}

        {currentStep === 3 && (
          <StepConfirmation items={items} hasPendingSession={hasPendingSession} isSubmitting={isSubmitting} onComplete={handleComplete} />
        )}
      </div>

      {/* Điều hướng chung */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          disabled={currentStep === 0 || isSubmitting}
          onClick={() => setCurrentStep((prev) => prev - 1)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        {currentStep === 2 && (
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            disabled={items.length === 0 && !hasPendingSession}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <span>Xem lại kế hoạch & Xác nhận ({items.length} mục)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
