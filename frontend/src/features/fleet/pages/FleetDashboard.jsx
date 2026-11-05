
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { LayoutGrid, List, Plus, Settings2, RefreshCw } from 'lucide-react';

import { axiosInstance } from '../../../shared/api/axiosInstance';

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

    // Giữ ID để sử dụng khi tích hợp chức năng CRUD
    locationId: machine.location?.id ?? null,
    operatorId: machine.operator?.id ?? null,
    currentTemp: machine.currentTemp ?? null,
  };
}

export default function FleetDashboard() {
  const [machines, setMachines] = useState([]);
  const [viewMode, setViewMode] = useState('TABLE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State: tạm giữ cấu trúc hiện tại
  const [formData, setFormData] = useState({
    serial: '',
    name: '',
    location: null,
    operator: null,
    status: 'ONLINE',
  });

  // GET /api/v1/machines
  const fetchMachines = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axiosInstance.get('/api/v1/machines');

      if (!Array.isArray(response.data)) {
        throw new Error('Dữ liệu Machine API không đúng định dạng danh sách.');
      }

      setMachines(response.data.map(mapMachineFromApi));
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
      setFormData({ ...machine });
    } else {
      setEditingMachine(null);
      setFormData({
        serial: '',
        name: '',
        location: null,
        operator: null,
        status: 'ONLINE',
      });
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMachine(null);
  };

  // Chưa kết nối POST/PUT API.
  // Không tự cập nhật state để tránh tạo dữ liệu giả.
  const handleSave = (e) => {
    e.preventDefault();

    alert(
      'Chức năng thêm/sửa máy đang chờ tích hợp POST/PUT Machine API.'
    );
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
      />
    </div>
  );
}
