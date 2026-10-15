import React, { useState, useMemo } from 'react';
import { LayoutGrid, List, Plus, Settings2 } from 'lucide-react';
import { mockLocations, mockOperators, initialMachines } from '../mocks/fleetMocks';
import QuickStats from '../components/QuickStats';
import MachineTable from '../components/MachineTable';
import MachineGrid from '../components/MachineGrid';
import MachineModal from '../components/MachineModal';

export default function FleetDashboard() {
  const [machines, setMachines] = useState(initialMachines);
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'GRID'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    serial: '',
    name: '',
    location: mockLocations[0],
    operator: mockOperators[0],
    status: 'ONLINE'
  });

  // Derived Stats
  const stats = useMemo(() => {
    return {
      total: machines.length,
      active: machines.filter(m => m.status === 'ONLINE').length,
      error: machines.filter(m => m.status === 'OFFLINE' || m.status === 'MAINTENANCE').length
    };
  }, [machines]);

  // Handlers
  const handleOpenModal = (machine = null) => {
    if (machine) {
      setEditingMachine(machine);
      setFormData({ ...machine });
    } else {
      setEditingMachine(null);
      setFormData({
        serial: '',
        name: '',
        location: mockLocations[0],
        operator: mockOperators[0],
        status: 'ONLINE'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMachine(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingMachine) {
      setMachines(machines.map(m => m.id === editingMachine.id ? { ...formData, id: m.id, lastSeen: m.lastSeen } : m));
    } else {
      const newMachine = {
        ...formData,
        id: Date.now().toString(),
        lastSeen: 'Vừa xong'
      };
      setMachines([newMachine, ...machines]);
    }
    handleCloseModal();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Máy bán hàng</h1>
            <p className="text-sm text-gray-500 mt-1">Giám sát và quản lý mạng lưới thiết bị (Fleet View)</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm máy mới
          </button>
        </div>

        {/* Quick Stats Header */}
        <QuickStats stats={stats} />

        {/* Toolbar & View Switcher */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                placeholder="Tìm kiếm Serial, tên máy..." 
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Settings2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('TABLE')}
              className={`p-2 rounded-md flex items-center justify-center transition-all ${viewMode === 'TABLE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Table View"
            >
              <List className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('GRID')}
              className={`p-2 rounded-md flex items-center justify-center transition-all ${viewMode === 'GRID' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'TABLE' ? (
          <MachineTable machines={machines} handleOpenModal={handleOpenModal} />
        ) : (
          <MachineGrid machines={machines} handleOpenModal={handleOpenModal} />
        )}
      </div>

      {/* Modal Overlay */}
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
