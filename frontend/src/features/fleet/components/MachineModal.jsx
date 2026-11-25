import React from 'react';
import { X, Thermometer, Droplets, DoorClosed, Clock } from 'lucide-react';

function formatOperatorLabel(operator) {
  const displayName =
    operator.fullName || operator.name || operator.username || `Operator #${operator.id}`;
  if (operator.username && operator.username !== displayName) {
    return `${displayName} (@${operator.username})`;
  }
  if (operator.email) {
    return `${displayName} (${operator.email})`;
  }
  return displayName;
}

export const MachineModal = ({
  isOpen,
  handleCloseModal,
  handleSave,
  editingMachine,
  formData,
  handleFormChange,
  locations = [],
  operators = [],
  saving = false,
  error = '',
  detailLoading = false,
}) => {
  if (!isOpen) return null;

  // Giữ lại option hiện tại nếu máy đang sửa được gán cho Operator không còn trong danh sách tải về
  const hasCurrentOperatorInList =
    !formData.operatorId ||
    operators.some((op) => String(op.id) === String(formData.operatorId));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingMachine ? `Chi tiết & Cập nhật Máy #${editingMachine.id}` : 'Thêm máy bán hàng mới'}
          </h3>
          <button
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {editingMachine && (
          <div className="px-5 pt-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-blue-500" /> Nhiệt độ hiện tại
                </span>
                <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">
                  {detailLoading
                    ? 'Đang tải...'
                    : editingMachine.currentTemp !== null
                    ? `${Number(editingMachine.currentTemp).toFixed(1)}°C`
                    : 'Chưa có dữ liệu'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-500" /> Độ ẩm hiện tại
                </span>
                <p className="font-mono font-bold text-cyan-700 text-sm mt-0.5">
                  {detailLoading
                    ? 'Đang tải...'
                    : editingMachine.currentHumidity !== null
                    ? `${Number(editingMachine.currentHumidity).toFixed(0)}%`
                    : 'Chưa có dữ liệu'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 flex items-center gap-1">
                  <DoorClosed className="w-3.5 h-3.5 text-gray-500" /> Trạng thái cửa
                </span>
                <p className="font-semibold text-gray-800 mt-0.5">{editingMachine.doorLabel}</p>
              </div>
              <div>
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-500" /> Nhận gần nhất
                </span>
                <p className="font-semibold text-gray-800 mt-0.5">{editingMachine.lastSeen}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="serial"
              value={formData.serial}
              onChange={handleFormChange}
              required
              placeholder="VD: VM-2024-001"
              maxLength={80}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên hiển thị <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              placeholder="VD: Máy Kiosk Sảnh B"
              maxLength={150}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vị trí đặt máy <span className="text-red-500">*</span>
            </label>
            <select
              name="locationId"
              value={formData.locationId}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white"
            >
              <option value="">Chọn vị trí</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* [FE3] Thay ô nhập số operatorId mặc định 1 bằng Dropdown user role OPERATOR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nhân viên vận hành (OPERATOR) <span className="text-red-500">*</span>
            </label>
            <select
              name="operatorId"
              value={formData.operatorId}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white"
            >
              <option value="">
                {operators.length > 0
                  ? 'Chọn nhân viên vận hành'
                  : 'Chưa tải được danh sách Operator'}
              </option>
              {!hasCurrentOperatorInList && formData.operatorId && (
                <option value={formData.operatorId}>
                  {editingMachine?.operator && editingMachine.operator !== 'Chưa phân công'
                    ? `${editingMachine.operator} (#${formData.operatorId})`
                    : `Operator #${formData.operatorId}`}
                </option>
              )}
              {operators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {formatOperatorLabel(operator)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhiệt độ tối thiểu (°C)
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhiệt độ tối đa (°C)
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái máy (PATCH /status)
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white"
              >
                <option value="ONLINE">Hoạt động (ONLINE)</option>
                <option value="OFFLINE">Mất kết nối (OFFLINE)</option>
                <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
                <option value="ERROR">Lỗi (ERROR)</option>
                <option value="OUT_OF_ORDER">Ngừng hoạt động (OUT_OF_ORDER)</option>
              </select>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving || locations.length === 0 || (operators.length === 0 && !formData.operatorId)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50"
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
