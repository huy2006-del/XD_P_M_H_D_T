import React from 'react';
import { X } from 'lucide-react';

export const MachineModal = ({ 
  isOpen, 
  handleCloseModal, 
  handleSave, 
  editingMachine, 
  formData, 
  handleFormChange,
  locations = [],
  saving = false,
  error = ''
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
              maxLength={80}
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
              maxLength={150}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleFormChange}
              maxLength={100}
              placeholder="VD: FreshVend X1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí đặt máy <span className="text-red-500">*</span></label>
            <select 
              name="locationId"
              value={formData.locationId}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
            >
              <option value="">Chọn vị trí</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator ID <span className="text-red-500">*</span></label>
            <input
              type="number"
              name="operatorId"
              value={formData.operatorId}
              onChange={handleFormChange}
              min="1"
              step="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ tối thiểu (°C)</label>
              <input
                type="number"
                name="tempMinThreshold"
                value={formData.tempMinThreshold}
                onChange={handleFormChange}
                min="-50"
                max="50"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ tối đa (°C)</label>
              <input
                type="number"
                name="tempMaxThreshold"
                value={formData.tempMaxThreshold}
                onChange={handleFormChange}
                min="-50"
                max="50"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              />
            </div>
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
                <option value="ERROR">Lỗi (Error)</option>
                <option value="OUT_OF_ORDER">Ngừng hoạt động</option>
              </select>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={handleCloseModal}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              disabled={saving || locations.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              {saving ? 'Đang lưu...' : editingMachine ? 'Cập nhật' : 'Lưu máy mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MachineModal;
