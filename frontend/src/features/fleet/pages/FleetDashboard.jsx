import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

import { axiosInstance } from '../../../shared/api/axiosInstance';
import { useWebSocketSubscription } from '../../../shared/realtime/useWebSocketSubscription';
import { alertService } from '../../alerts/alertService';

import QuickStats from '../components/QuickStats';
import MachineTable from '../components/MachineTable';
import MachineGrid from '../components/MachineGrid';
import MachineModal from '../components/MachineModal';

const STALE_THRESHOLD_MS = 30_000;

function formatDoorLabel(machine) {
  if (typeof machine.doorOpen === 'boolean') {
    return machine.doorOpen ? 'Đang mở' : 'Đã đóng';
  }
  if (machine.doorStatus === 'OPEN') return 'Đang mở';
  if (machine.doorStatus === 'CLOSED') return 'Đã đóng';
  if (machine.doorStatus) return machine.doorStatus;
  return 'Chưa có cảm biến từ BE';
}

function resolveTelemetryFreshness(lastIso, status, isTelemetryLoading) {
  if (isTelemetryLoading) return 'LOADING';
  if (!lastIso) return 'EMPTY';
  const ts = new Date(lastIso).getTime();
  if (Number.isNaN(ts)) return 'EMPTY';
  if (status === 'OFFLINE' || Date.now() - ts > STALE_THRESHOLD_MS) {
    return 'STALE';
  }
  return 'FRESH';
}

// [FE3] Chuẩn hóa & lọc danh sách tài khoản có vai trò OPERATOR từ Backend
function extractOperatorsFromResponse(rawData) {
  const list = Array.isArray(rawData) ? rawData : rawData?.content ?? [];
  return list.filter((user) => {
    if (user?.role) {
      return String(user.role).toUpperCase().includes('OPERATOR');
    }
    if (Array.isArray(user?.roles)) {
      return user.roles.some((r) =>
        String(typeof r === 'string' ? r : r?.name ?? r?.authority ?? '')
          .toUpperCase()
          .includes('OPERATOR')
      );
    }
    return true;
  });
}

function mapMachineFromApi(
  machine,
  latestTelemetry,
  telemetryLoading,
  unresolvedCount,
  operatorLookup = {}
) {
  const lastPingIso = latestTelemetry?.recordedAt || machine.lastPingAt || null;
  const currentTemp =
    latestTelemetry?.temperature ?? machine.currentTemp ?? null;
  const currentHumidity =
    latestTelemetry?.humidity ?? machine.currentHumidity ?? null;
  const resolvedOperatorId = machine.operator?.id ?? machine.operatorId ?? null;

  return {
    id: String(machine.id),
    numericId: Number(machine.id),
    serial: machine.serialNumber ?? '',
    name: machine.name ?? 'Chưa đặt tên',
    location:
      machine.location?.name ?? machine.locationName ?? 'Chưa cập nhật',
    operator:
      machine.operator?.fullName ??
      machine.operator?.name ??
      (resolvedOperatorId != null ? operatorLookup[Number(resolvedOperatorId)] : null) ??
      'Chưa phân công',
    status: machine.status ?? 'OFFLINE',
    lastPingIso,
    lastSeen: lastPingIso
      ? new Date(lastPingIso).toLocaleString('vi-VN')
      : 'Chưa có dữ liệu',
    locationId: machine.location?.id ?? null,
    operatorId: resolvedOperatorId,
    model: machine.model ?? '',
    tempMinThreshold: machine.tempMinThreshold ?? 2,
    tempMaxThreshold: machine.tempMaxThreshold ?? 8,
    currentTemp,
    currentHumidity,
    doorLabel: formatDoorLabel(machine),
    telemetryFreshness: resolveTelemetryFreshness(
      lastPingIso,
      machine.status,
      telemetryLoading
    ),
    unresolvedAlertsCount: unresolvedCount,
  };
}

export default function FleetDashboard() {
  const navigate = useNavigate();

  const [rawMachines, setRawMachines] = useState([]);
  const [telemetryByMachine, setTelemetryByMachine] = useState({});
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [operators, setOperators] = useState([]);

  const [viewMode, setViewMode] = useState('TABLE');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [formData, setFormData] = useState({
    serial: '',
    name: '',
    model: '',
    locationId: '',
    operatorId: '',
    tempMinThreshold: '2',
    tempMaxThreshold: '8',
    status: 'ONLINE',
  });

  const fetchLatestTelemetryForMachines = useCallback(async (machineList) => {
    if (!machineList.length) {
      setTelemetryByMachine({});
      return;
    }
    setTelemetryLoading(true);
    try {
      // Dùng history?limit=1 thay vì /latest để tránh HTTP 404 gây toast lỗi khi máy chưa có log
      const results = await Promise.allSettled(
        machineList.map((m) =>
          axiosInstance
            .get(`/api/v1/machines/${m.id}/telemetry/history`, {
              params: { limit: 1 },
            })
            .then((res) => ({
              machineId: Number(m.id),
              latest: Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null,
            }))
        )
      );

      const nextMap = {};
      for (const item of results) {
        if (item.status === 'fulfilled') {
          nextMap[item.value.machineId] = item.value.latest;
        }
      }
      setTelemetryByMachine(nextMap);
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  const fetchFleetData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [machineRes, locationRes, alertList, operatorRes] = await Promise.all([
        axiosInstance.get('/api/v1/machines'),
        axiosInstance.get('/api/v1/locations'),
        alertService.getAlerts(),
        // [FE3] Tải danh sách tài khoản role OPERATOR (không làm gián đoạn trang nếu BE tạm lỗi endpoint users)
        axiosInstance
          .get('/api/v1/users', { params: { role: 'OPERATOR' } })
          .catch(() => ({ data: [] })),
      ]);

      if (!Array.isArray(machineRes.data)) {
        throw new Error('Dữ liệu Machine API không đúng định dạng danh sách.');
      }
      if (!Array.isArray(locationRes.data)) {
        throw new Error('Dữ liệu Location API không đúng định dạng danh sách.');
      }

      setRawMachines(machineRes.data);
      setLocations(locationRes.data);
      setAlerts(alertList);
      setOperators(extractOperatorsFromResponse(operatorRes.data));
      void fetchLatestTelemetryForMachines(machineRes.data);
    } catch (err) {
      console.error('Fetch fleet data failed:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Không thể tải danh sách máy từ Backend.'
      );
    } finally {
      setLoading(false);
    }
  }, [fetchLatestTelemetryForMachines]);

  useEffect(() => {
    void fetchFleetData();
  }, [fetchFleetData]);

  // Đồng bộ cảnh báo & trạng thái máy realtime qua /topic/alerts
  const alertsWs = useWebSocketSubscription('/topic/alerts', (incomingAlert) => {
    if (!incomingAlert?.id) return;
    setAlerts((prev) => {
      const exists = prev.some((a) => a.id === incomingAlert.id);
      if (exists) {
        return prev.map((a) => (a.id === incomingAlert.id ? incomingAlert : a));
      }
      return [incomingAlert, ...prev];
    });
    if (incomingAlert.severity === 'CRITICAL') {
      void fetchFleetData();
    }
  });

  const operatorLookup = useMemo(() => {
    const map = {};
    for (const op of operators) {
      if (op?.id != null) {
        map[Number(op.id)] = op.fullName ?? op.name ?? op.username ?? `Operator #${op.id}`;
      }
    }
    return map;
  }, [operators]);

  const unresolvedCountByMachine = useMemo(() => {
    const counts = {};
    for (const alert of alerts) {
      if (alert.status !== 'RESOLVED') {
        counts[alert.machineId] = (counts[alert.machineId] || 0) + 1;
      }
    }
    return counts;
  }, [alerts]);

  const machines = useMemo(() => {
    return rawMachines.map((m) =>
      mapMachineFromApi(
        m,
        telemetryByMachine[Number(m.id)] || null,
        telemetryLoading,
        unresolvedCountByMachine[Number(m.id)] || 0,
        operatorLookup
      )
    );
  }, [rawMachines, telemetryByMachine, telemetryLoading, unresolvedCountByMachine, operatorLookup]);

  const filteredMachines = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return machines.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.serial.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q)
      );
    });
  }, [machines, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: machines.length,
      active: machines.filter((m) => m.status === 'ONLINE').length,
      error: machines.filter(
        (m) =>
          m.status === 'OFFLINE' ||
          m.status === 'MAINTENANCE' ||
          m.status === 'ERROR' ||
          m.status === 'OUT_OF_ORDER'
      ).length,
      unresolvedAlerts: alerts.filter((a) => a.status !== 'RESOLVED').length,
    }),
    [machines, alerts]
  );

  const handleOpenModal = async (machine = null) => {
    setSaveError('');
    if (machine) {
      setEditingMachine(machine);
      setFormData({
        ...machine,
        locationId: machine.locationId == null ? '' : String(machine.locationId),
        operatorId: machine.operatorId == null ? '' : String(machine.operatorId),
        tempMinThreshold: String(machine.tempMinThreshold ?? 2),
        tempMaxThreshold: String(machine.tempMaxThreshold ?? 8),
      });
      setIsModalOpen(true);

      // Gọi GET /api/v1/machines/{id} để lấy dữ liệu chi tiết mới nhất từ BE
      try {
        setDetailLoading(true);
        const [detailRes, histRes] = await Promise.all([
          axiosInstance.get(`/api/v1/machines/${machine.id}`),
          axiosInstance.get(`/api/v1/machines/${machine.id}/telemetry/history`, {
            params: { limit: 1 },
          }),
        ]);
        const latest =
          Array.isArray(histRes.data) && histRes.data.length > 0 ? histRes.data[0] : null;
        const freshMapped = mapMachineFromApi(
          detailRes.data,
          latest,
          false,
          unresolvedCountByMachine[Number(machine.id)] || 0,
          operatorLookup
        );
        setEditingMachine(freshMapped);
        setFormData({
          ...freshMapped,
          locationId:
            freshMapped.locationId == null ? '' : String(freshMapped.locationId),
          operatorId:
            freshMapped.operatorId == null ? '' : String(freshMapped.operatorId),
          tempMinThreshold: String(freshMapped.tempMinThreshold ?? 2),
          tempMaxThreshold: String(freshMapped.tempMaxThreshold ?? 8),
        });
      } catch (err) {
        console.error('Không tải được chi tiết máy:', err);
      } finally {
        setDetailLoading(false);
      }
    } else {
      setEditingMachine(null);
      setFormData({
        serial: '',
        name: '',
        model: '',
        locationId: locations[0]?.id ? String(locations[0].id) : '',
        operatorId: operators[0]?.id ? String(operators[0].id) : '',
        tempMinThreshold: '2',
        tempMaxThreshold: '8',
        status: 'ONLINE',
      });
      setIsModalOpen(true);
    }
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
    const minThreshold =
      formData.tempMinThreshold === '' ? null : Number(formData.tempMinThreshold);
    const maxThreshold =
      formData.tempMaxThreshold === '' ? null : Number(formData.tempMaxThreshold);

    if (!formData.serial.trim() || !formData.name.trim()) {
      setSaveError('Serial Number và tên máy là bắt buộc.');
      return;
    }
    if (!Number.isInteger(locationId) || locationId <= 0) {
      setSaveError('Vui lòng chọn vị trí hợp lệ cho máy.');
      return;
    }
    if (!Number.isInteger(operatorId) || operatorId <= 0) {
      setSaveError('Vui lòng chọn nhân viên vận hành (Operator) hợp lệ.');
      return;
    }
    if (
      (minThreshold !== null && !Number.isFinite(minThreshold)) ||
      (maxThreshold !== null && !Number.isFinite(maxThreshold)) ||
      (minThreshold !== null && (minThreshold < -50 || minThreshold > 50)) ||
      (maxThreshold !== null && (maxThreshold < -50 || maxThreshold > 50)) ||
      (minThreshold !== null && maxThreshold !== null && minThreshold >= maxThreshold)
    ) {
      setSaveError('Ngưỡng nhiệt độ phải từ -50°C đến 50°C và tối thiểu nhỏ hơn tối đa.');
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
      await fetchFleetData();
      handleCloseModal();
      toast.success(editingMachine ? 'Đã cập nhật thông tin máy.' : 'Đã thêm máy mới.');
    } catch (err) {
      setSaveError(
        err.response?.data?.message || err.message || 'Không thể lưu thông tin máy.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý &amp; Giám sát Máy bán hàng
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
              <span>Dữ liệu trực tiếp từ Backend API</span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  alertsWs.isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {alertsWs.isConnected ? (
                  <>
                    <Wifi className="w-3 h-3" /> Alerts WS kết nối
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" /> Alerts WS mất kết nối
                    <button
                      onClick={alertsWs.reconnect}
                      className="ml-1 underline text-blue-700"
                    >
                      Kết nối lại
                    </button>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void fetchFleetData()}
              disabled={loading}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>

            <button
              onClick={() => void handleOpenModal()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm máy mới
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl p-6 text-center mb-6 border border-gray-100 text-sm text-gray-500">
            Đang tải danh sách máy và telemetry từ Backend...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 mb-6">
            <p>{error}</p>
            <button
              onClick={() => void fetchFleetData()}
              className="mt-2 underline text-sm font-medium"
            >
              Thử tải lại
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <QuickStats stats={stats} />

            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm Serial, tên máy, vị trí..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ONLINE">ONLINE</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="OUT_OF_ORDER">OUT_OF_ORDER</option>
                  <option value="ERROR">ERROR</option>
                </select>
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

            {filteredMachines.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-sm text-gray-500 border border-gray-100">
                {machines.length === 0
                  ? 'Backend hiện chưa có máy nào.'
                  : 'Không tìm thấy máy nào khớp từ khóa/bộ lọc.'}
              </div>
            ) : viewMode === 'TABLE' ? (
              <MachineTable
                machines={filteredMachines}
                handleOpenModal={(m) => void handleOpenModal(m)}
                onOpenMonitor={(m) => navigate(`/admin/machines/${m.id}/coldchain`)}
              />
            ) : (
              <MachineGrid
                machines={filteredMachines}
                handleOpenModal={(m) => void handleOpenModal(m)}
                onOpenMonitor={(m) => navigate(`/admin/machines/${m.id}/coldchain`)}
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
        operators={operators}
        saving={saving}
        error={saveError}
        detailLoading={detailLoading}
      />
    </div>
  );
}
