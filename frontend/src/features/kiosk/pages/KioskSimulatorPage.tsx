import React from 'react';
import KioskSimulator from '../KioskSimulator';

interface Props {
  machineId?: number;
}

export const KioskSimulatorPage: React.FC<Props> = ({ machineId = 1 }) => {
  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center font-sans overflow-hidden">
      {/* 
        Gọi thẳng ứng dụng Phần mềm POS ra toàn màn hình. 
        Không còn vỏ máy, tủ kính hay lò xo vật lý nữa.
      */}
      <KioskSimulator machineId={machineId} />
    </div>
  );
};
