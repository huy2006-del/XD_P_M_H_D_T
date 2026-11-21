
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { LayoutGrid, List, Plus, Settings2, RefreshCw } from 'lucide-react';

import { axiosInstance } from '../../../shared/api/axiosInstance';
import { toast } from 'sonner';

import QuickStats from '../components/QuickStats';
import MachineTable from '../components/MachineTable';
import MachineGrid from '../components/MachineGrid';
import MachineModal from '../components/MachineModal';

function mapMachineFromApi(machine) {
  return {
    id: String(machine.id),
    serial: machine.serialNumber ?? '',
    name: machine.name ?? 'Chưa đặt tên',
    location:
      machine.location?.name ??
      machine.locationName ??
      'Chưa cập nhật',
    operator:
      machine.operator?.fullName ??
      machine.operator?.name ??
      'Chưa phân công',
    status: machine.status ?? 'OFFLINE',
    lastSeen: machine.lastPingAt
      ? new Date(machine.lastPingAt).toLocaleString('vi-VN')
      : 'Chưa có dữ liệu',

    // Keep service-owned IDs for create/update requests.
    locationId: machine.location?.id ?? null,
    operatorId: machine.operator?.id ?? null,
    model: machine.model ?? '',
    tempMinThreshold: machine.tempMinThreshold ?? 2,
    tempMaxThreshold: machine.tempMaxThreshold ?? 8,
    currentTemp: machine.currentTemp ?? null,
  };
}

export default function FleetDashboard() {
  const [machines, setMachines] = useState([]);
  const [viewMode, setViewMode] = useState('TABLE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [locations, setLocations] = useState([]);

  // Form State: tạm giữ cấu trúc hiện tại
  const [formData, setFormData] = useState({
    serial: '',
    name: '',
    model: '',
    locationId: '',
    operatorId: '1',
    tempMinThreshold: '2',
    tempMaxThreshold: '8',
    status: 'ONLINE',
  });

  // GET /api/v1/machines
  const fetchMachines = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axiosInstance.get('/api/v1/machines');
      const locationResponse = await axiosInstance.get('/api/v1/locations');

      if (!Array.isArray(response.data)) {
        throw new Error('Dữ liệu Machine API không đúng định dạng danh sách.');
      }

      setMachines(response.data.map(mapMachineFromApi));
      if (!Array.isArray(locationResponse.data)) {
        throw new Error('Dữ liệu Location API không đúng định dạng danh sách.');
      }
      setLocations(locationResponse.data);
    } catch (err) {
      console.error('Fetch machines failed:', err);

      setError(
        err.response?.data?.message ||
        err.message ||
        'Không thể tải danh sách máy từ Backend.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // Derived Stats
  const stats = useMemo(() => ({
    total: machines.length,
    active: machines.filter(
      (machine) => machine.status === 'ONLINE'
    ).length,
    error: machines.filter(
      (machine) =>
        machine.status === 'OFFLINE' ||
        machine.status === 'MAINTENANCE'
    ).length,
  }), [machines]);

  // Modal handlers
  const handleOpenModal = (machine = null) => {
    if (machine) {
      setEditingMachine(machine);
      setFormData({
        ...machine,
        locationId: machine.locationId == null ? '' : String(machine.locationId),
        operatorId: machine.operatorId == null ? '1' : String(machine.operatorId),
        tempMinThreshold: String(machine.tempMinThreshold ?? 2),
        tempMaxThreshold: String(machine.tempMaxThreshold ?? 8),
      });
    } else {
      setEditingMachine(null);
      setFormData({
        serial: '',
        name: '',
        model: '',
        locationId: locations[0]?.id ? String(locations[0].id) : '',
        operatorId: '1',
        tempMinThreshold: '2',
        tempMaxThreshold: '8',
        status: 'ONLINE',
      });
    }

    setSaveError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMachine(null);
    setSaveError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const locationId = Number(formData.locationId);
    const operatorId = Number(formData.operatorId);
    const minThreshold = formData.tempMinThreshold === '' ? null : Number(formData.tempMinThreshold);
    const maxThreshold = formData.tempMaxThreshold === '' ? null : Number(formData.tempMaxThreshold);
    if (!formData.serial.trim() || !formData.name.trim()) {
      setSaveError('Serial Number và tên máy là bắt buộc.');
      return;
    }
    if (!Number.isInteger(locationId) || locationId <= 0) {
      setSaveError('Vui lòng chọn vị trí hợp lệ cho máy.');
      return;
    }
    if (!Number.isInteger(operatorId) || operatorId <= 0) {
      setSaveError('Operator ID phải là số nguyên dương.');
      return;
    }
    if ((minThreshold !== null && !Number.isFinite(minThreshold)) ||
        (maxThreshold !== null && !Number.isFinite(maxThreshold)) ||
        (minThreshold !== null && (minThreshold < -50 || minThreshold > 50)) ||
        (maxThreshold !== null && (maxThreshold < -50 || maxThreshold > 50)) ||
        (minThreshold !== null && maxThreshold !== null && minThreshold >= maxThreshold)) {
      setSaveError('Ngưỡng nhiệt độ phải từ -50°C đến 50°C và tối thiểu phải nhỏ hơn tối đa.');
      return;
    }

    const request = {
      serialNumber: formData.serial.trim(),
      name: formData.name.trim(),
      model: formData.model.trim() || null,
      locationId,
      operatorId,
      tempMinThreshold: minThreshold,
      tempMaxThreshold: maxThreshold,
    };

    try {
      setSaving(true);
      setSaveError('');
      if (editingMachine) {
        await axiosInstance.put(`/api/v1/machines/${editingMachine.id}`, request);
        if (formData.status !== editingMachine.status) {
          await axiosInstance.patch(`/api/v1/machines/${editingMachine.id}/status`, {
            status: formData.status,
          });
        }
      } else {
        await axiosInstance.post('/api/v1/machines', request);
      }
      await fetchMachines();
      handleCloseModal();
      toast.success(editingMachine ? 'Đã cập nhật thông tin máy.' : 'Đã thêm máy mới.');
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Không thể lưu thông tin máy.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý Máy bán hàng
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Giám sát và quản lý mạng lưới thiết bị (Fleet View)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchMachines}
              disabled={loading}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>

            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm máy mới
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl p-6 text-center mb-6">
            Đang tải danh sách máy...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 mb-6">
            <p>{error}</p>
            <button
              onClick={fetchMachines}
              className="mt-2 underline text-sm font-medium"
            >
              Thử tải lại
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <QuickStats stats={stats} />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 gap-4">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Tìm kiếm Serial, tên máy..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Settings2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`p-2 rounded-md flex items-center justify-center transition-all ${
                    viewMode === 'TABLE'
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Table View"
                >
                  <List className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setViewMode('GRID')}
                  className={`p-2 rounded-md flex items-center justify-center transition-all ${
                    viewMode === 'GRID'
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Machine List */}
            {machines.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center rounded-xl">
                Backend hiện chưa có máy nào.
              </div>
            ) : viewMode === 'TABLE' ? (
              <MachineTable
                machines={machines}
                handleOpenModal={handleOpenModal}
              />
            ) : (
              <MachineGrid
                machines={machines}
                handleOpenModal={handleOpenModal}
              />
            )}
          </>
        )}
      </div>

      <MachineModal
        isOpen={isModalOpen}
        handleCloseModal={handleCloseModal}
        handleSave={handleSave}
        editingMachine={editingMachine}
        formData={formData}
        handleFormChange={handleFormChange}
        locations={locations}
        saving={saving}
        error={saveError}
      />
    </div>
  );
}
