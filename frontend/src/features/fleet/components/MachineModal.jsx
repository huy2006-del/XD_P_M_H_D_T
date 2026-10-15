import React from 'react';
import { X } from 'lucide-react';
import { mockLocations, mockOperators } from '../mocks/fleetMocks';

export const MachineModal = ({ 
  isOpen, 
  handleCloseModal, 
  handleSave, 
  editingMachine, 
  formData, 
  handleFormChange 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingMachine ? 'Sửa thông tin máy' : 'Thêm máy bán hàng mới'}
          </h3>
          <button 
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              name="serial"
              value={formData.serial}
              onChange={handleFormChange}
              required
              placeholder="VD: VM-2024-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              placeholder="VD: Máy Kiosk Sảnh B"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí đặt máy (Location)</label>
            <select 
              name="location"
              value={formData.location}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
            >
              {mockLocations.map((loc, idx) => (
                <option key={idx} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator phụ trách</label>
            <select 
              name="operator"
              value={formData.operator}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
            >
              {mockOperators.map((op, idx) => (
                <option key={idx} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {editingMachine && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái (Giả lập)</label>
              <select 
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
              >
                <option value="ONLINE">Hoạt động (Online)</option>
                <option value="OFFLINE">Mất kết nối (Offline)</option>
                <option value="MAINTENANCE">Bảo trì (Maintenance)</option>
              </select>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              {editingMachine ? 'Cập nhật' : 'Lưu máy mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MachineModal;
