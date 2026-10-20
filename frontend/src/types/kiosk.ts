export interface MachineOption {
  id: string;
  name: string;
  location: string;
}

export interface ProductSlot {
  slotId: string;
  slotCode: string; // VD: A1, A2, B1...
  productName: string;
  price: number;
  stock: number;
  imageUrl: string;
  description: string;
  batchInfo?: string; // Dùng cho mô phỏng FIFO
}
