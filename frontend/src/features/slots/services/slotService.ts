
import axiosInstance from "../../../shared/api/axiosInstance";
import type { MachineSlot } from "../slotTypes";

export type SlotInventoryItem = {
  batchId: number;
  batchCode: string;
  expiryDate: string;
  quantity: number;
};

export async function getMachineSlots(
  machineId: number
): Promise<MachineSlot[]> {
  const response = await axiosInstance.get<MachineSlot[]>(
    `/api/v1/machines/${machineId}/slots`
  );

  return response.data;
}

export async function getSlotInventory(
  slotId: number
): Promise<SlotInventoryItem[]> {
  const response = await axiosInstance.get<SlotInventoryItem[]>(
    `/api/v1/slots/${slotId}/inventory`
  );

  return response.data;
}

export type SlotProduct = {
  id: string;
  name: string;
  sku: string;
  isActive: boolean;
};

type ProductPage = {
  content: SlotProduct[];
};

export async function getSlotProducts(): Promise<SlotProduct[]> {
  const response = await axiosInstance.get<ProductPage>(
    "/api/v1/products?page=0&size=100"
  );

  return response.data.content;
}

export async function updateMachineSlot(
  slot: MachineSlot,
  productId: number | null,
  capacity: number
): Promise<MachineSlot> {
  const response = await axiosInstance.put<MachineSlot>(
    `/api/v1/slots/${slot.slotId}`,
    {
      slotCode: slot.slotCode,
      productId,
      capacity,
    }
  );

  return response.data;
}