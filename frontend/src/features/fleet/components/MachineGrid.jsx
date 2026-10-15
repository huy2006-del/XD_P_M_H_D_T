import React from 'react';
import { Cpu, MapPin, Activity } from 'lucide-react';
import StatusBadge from './StatusBadge';

export const MachineGrid = ({ machines, handleOpenModal }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {machines.map((machine) => (
        <div 
          key={machine.id} 
          className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all hover:shadow-md
            border-l-4 
            ${machine.status === 'ONLINE' ? 'border-l-green-500' : 
              machine.status === 'OFFLINE' ? 'border-l-gray-400' : 'border-l-yellow-500'}
          `}
        >
          <div className="p-5 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Cpu className="w-5 h-5" />
              </div>
              <StatusBadge status={machine.status} />
            </div>
            
            <h4 className="text-lg font-semibold text-gray-900 mb-1">{machine.name}</h4>
            <p className="text-xs text-gray-400 font-mono mb-4">SN: {machine.serial}</p>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{machine.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400 shrink-0" />
                <span>Cập nhật: {machine.lastSeen}</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 bg-gray-50/50 p-3">
            <button 
              onClick={() => handleOpenModal(machine)}
              className="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              Xem chi tiết / Sửa
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MachineGrid;
