export const mockLocations = [
  'Sảnh A - Tòa nhà Vincom', 
  'Tầng 2 - Lotte Mart', 
  'Khu C - Đại học Quốc gia',
  'Tầng 1 - Sân bay Tân Sơn Nhất',
  'Hầm B1 - Crescent Mall'
];

export const mockOperators = [
  'Nguyễn Văn A (OP01)', 
  'Trần Thị B (OP02)', 
  'Lê Văn C (OP03)',
  'Phạm Thị D (OP04)'
];

export const initialMachines = [
  { id: '1', serial: 'VM-2023-001', name: 'Máy Kiosk Sảnh A', location: 'Sảnh A - Tòa nhà Vincom', status: 'ONLINE', lastSeen: 'Vừa xong', operator: 'Nguyễn Văn A (OP01)' },
  { id: '2', serial: 'VM-2023-002', name: 'Máy Tầng 2 Lotte', location: 'Tầng 2 - Lotte Mart', status: 'OFFLINE', lastSeen: '2 giờ trước', operator: 'Trần Thị B (OP02)' },
  { id: '3', serial: 'VM-2023-003', name: 'Máy Khu C ĐHQG', location: 'Khu C - Đại học Quốc gia', status: 'ONLINE', lastSeen: '5 phút trước', operator: 'Lê Văn C (OP03)' },
  { id: '4', serial: 'VM-2023-004', name: 'Máy Sân bay TSN', location: 'Tầng 1 - Sân bay Tân Sơn Nhất', status: 'MAINTENANCE', lastSeen: '1 ngày trước', operator: 'Nguyễn Văn A (OP01)' },
  { id: '5', serial: 'VM-2023-005', name: 'Máy Hầm B1 Crescent', location: 'Hầm B1 - Crescent Mall', status: 'ONLINE', lastSeen: '10 phút trước', operator: 'Phạm Thị D (OP04)' },
];
