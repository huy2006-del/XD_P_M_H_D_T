import type { MachineOption, ProductSlot } from '../types/kiosk';

export const MOCK_MACHINES: MachineOption[] = [
  { id: 'vm-01', name: 'Máy Landmark 81', location: 'Tầng G - Sảnh Chính' },
  { id: 'vm-02', name: 'Máy Bitexco Tower', location: 'Tầng 1 - Khu Văn Phòng' },
  { id: 'vm-03', name: 'Máy Vincom Đồng Khởi', location: 'Tầng B2 - Gần Thang Máy' },
];

export const MOCK_INVENTORY_DATA: Record<string, ProductSlot[]> = {
  'vm-01': [
    { slotId: 'slot-101', slotCode: 'A1', productName: 'Táo Fuji Nhật', price: 35000, stock: 5, imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500', description: 'Táo giòn ngọt tự nhiên, dồi dào Vitamin C, nhập khẩu tươi mới.', batchInfo: 'Lô B2024-01 (HSD: 3 ngày)' },
    { slotId: 'slot-102', slotCode: 'A2', productName: 'Cam Vàng Navel', price: 28000, stock: 8, imageUrl: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=500', description: 'Cam mọng nước, vị ngọt thanh tự nhiên, giàu chất chống oxy hóa.', batchInfo: 'Lô B2024-03 (HSD: 5 ngày)' },
    { slotId: 'slot-103', slotCode: 'A3', productName: 'Chuối Laba Đà Lạt', price: 15000, stock: 2, imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500', description: 'Chuối dẻo thơm, nguồn cung cấp Kali và năng lượng tức thì.', batchInfo: 'Lô B2024-02 (HSD: 2 ngày)' },
    { slotId: 'slot-104', slotCode: 'B1', productName: 'Nho Mẫu Đơn', price: 85000, stock: 4, imageUrl: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=500', description: 'Nho giòn ngọt không hạt, hương thơm đặc trưng thượng hạng.', batchInfo: 'Lô B2024-05 (HSD: 4 ngày)' },
    { slotId: 'slot-105', slotCode: 'B2', productName: 'Dâu Tây Đà Lạt', price: 60000, stock: 0, imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500', description: 'Dâu chua ngọt hài hòa, hái tươi trong ngày.', batchInfo: 'Hết hàng' },
    { slotId: 'slot-106', slotCode: 'B3', productName: 'Kiwi Xanh New Zealand', price: 42000, stock: 6, imageUrl: 'https://images.unsplash.com/photo-1585059819970-313833215286?w=500', description: 'Kiwi xanh tươi mát, đậm vị, giàu chất xơ tốt cho tiêu hóa.', batchInfo: 'Lô B2024-04 (HSD: 6 ngày)' },
  ],
  'vm-02': [
    { slotId: 'slot-201', slotCode: 'A1', productName: 'Táo Fuji Nhật', price: 35000, stock: 3, imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500', description: 'Táo giòn ngọt tươi ngon.', batchInfo: 'Lô B2024-01' },
    { slotId: 'slot-202', slotCode: 'A2', productName: 'Cam Vàng Navel', price: 28000, stock: 0, imageUrl: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=500', description: 'Cam mọng nước.', batchInfo: 'Hết hàng' },
  ],
  'vm-03': [
    { slotId: 'slot-301', slotCode: 'A1', productName: 'Dâu Tây Đà Lạt', price: 60000, stock: 10, imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500', description: 'Dâu chua ngọt tươi hái.', batchInfo: 'Lô B2024-08' },
  ]
};
