import React, { useState } from 'react';
import { useMachineSlots } from '../hooks/useMachineSlots';
import { SlotCard } from './SlotCard';
import { SlotConfigModal } from './SlotConfigModal';
import { MachineSlot } from '../types';

interface Props {
  machineId: number;
}

export const MachineSlotGrid: React.FC<Props> = ({ machineId }) => {
  const { slots, loading, updateSlot } = useMachineSlots(machineId);
  const [selectedSlot, setSelectedSlot] = useState<MachineSlot | null>(null);

  if (loading) return <div>Đang tải sơ đồ khay...</div>;

  // Nhóm các slot theo tầng (Dựa vào chữ cái đầu của slot_code, ví dụ A1 -> Tầng A)
  const groupedSlots = slots.reduce((acc, slot) => {
    const floor = slot.slot_code.charAt(0).toUpperCase();
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(slot);
    return acc;
  }, {} as Record<string, MachineSlot[]>);

  return (
    <div className="bg-gray-50 p-6 rounded-lg border">
      <h2 className="text-lg font-bold mb-4">Sơ đồ Khay Máy #{machineId}</h2>
      
      <div className="space-y-6">
        {Object.entries(groupedSlots).sort().map(([floor, floorSlots]) => (
          <div key={floor}>
            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase">Tầng {floor}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {floorSlots.map(slot => (
                <SlotCard 
                  key={slot.id} 
                  slot={slot} 
                  onClickConfig={(s) => setSelectedSlot(s)} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedSlot && (
        <SlotConfigModal
          isOpen={!!selectedSlot}
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSave={updateSlot}
        />
      )}
    </div>
  );
};
