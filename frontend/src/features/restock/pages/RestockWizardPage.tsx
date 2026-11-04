import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRestockPlan } from '../hooks/useRestockPlan';
import { StepSelectMachine } from '../components/StepSelectMachine';
import { StepSelectSlot } from '../components/StepSelectSlot';
import { StepRestockItems } from '../components/StepRestockItems';
import { StepConfirmation } from '../components/StepConfirmation';
import type { Machine, MachineSlot } from '../types';

const STEPS = ['Chọn máy', 'Chọn khay', 'Lập kế hoạch', 'Xác nhận nạp'];

export const RestockWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<MachineSlot | null>(null);
  
  const { items, isSubmitting, error, addItem, completePlan, resetPlan } = useRestockPlan();

  const handleMachineSelect = (machine: Machine) => {
    resetPlan();
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

    toast.success('Đã nạp hàng thành công.');
    navigate('/operator', { replace: true });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Nạp hàng vào máy</h1>
      
      {/* Thanh Trạng Thái Steps */}
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
        {STEPS.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center bg-white px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 
              ${idx === currentStep ? 'bg-blue-600 text-white border-blue-600' : 
                idx < currentStep ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-300'}`}>
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <span className={`text-xs mt-2 font-medium ${idx === currentStep ? 'text-blue-600' : 'text-gray-500'}`}>{step}</span>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</div>}

      {/* Nội dung từng bước */}
      <div className="bg-white p-6 rounded-xl shadow-sm border min-h-[400px]">
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
          />
        )}
        
        {currentStep === 3 && (
          <StepConfirmation
            items={items}
            isSubmitting={isSubmitting}
            onComplete={handleComplete}
          />
        )}
      </div>

      {/* Nút điều hướng chung */}
      <div className="flex justify-between mt-6">
        <button 
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(prev => prev - 1)}
          className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Quay lại
        </button>
        
        {currentStep === 2 && (
          <button 
            onClick={() => setCurrentStep(3)}
            disabled={items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Xem lại kế hoạch
          </button>
        )}
      </div>
    </div>
  );
};