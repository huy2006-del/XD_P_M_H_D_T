
export type MachineSlot = {
  slotId: number;
  slotCode: string;
  capacity: number;
  currentStock: number;
  status: string;
  productId: number | null;
  productName: string | null;
  productPrice: number | null;
  productImageUrl: string | null;
};
