export interface Machine {
  id: number;
  serialNumber: string;
  name: string;
  locationName: string;
  status: string;
}

export interface MachineSlot {
  slotId: number;
  slotCode: string;
  capacity: number;
  currentStock: number;
  status: string;
  productId: number | null;
  productName: string | null;
}

export interface FruitBatch {
  id: number;
  batchCode: string;
  expiryDate: string;
  productId: number;
  productName: string;
  quantityRemaining: number;
  expired: boolean;
  supplier?: string;
  quantityImported?: number;
  unitCost?: number;
}

export interface RestockItem {
  id?: number;
  requestId?: string;
  sessionId?: number;
  slotId: number;
  batchId: number;
  quantityAdded: number;
  slotCode: string;
  productName: string;
  batchCode: string;
}

export interface RestockSession {
  id: number;
  sessionCode: string;
  machineId: number;
  operatorId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startedAt: string;
  completedAt?: string;
  notes?: string;
  items: Array<
    Pick<RestockItem, 'slotId' | 'batchId' | 'quantityAdded'> & {
      id: number;
      slotCode?: string;
      batchCode?: string;
      productName?: string;
    }
  >;
}

export interface AddItemRequest {
  slotId: number;
  batchId: number;
  quantityAdded: number;
}