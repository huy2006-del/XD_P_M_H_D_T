import { axiosInstance } from '../../shared/api/axiosInstance';

export type OrderStatus =
  | 'SUCCESS'
  | 'PENDING_PAYMENT'
  | 'REFUNDED_JAMMED'
  | 'PAYMENT_FAILED'
  | 'DISPENSING';

export interface OrderLineItem {
  id?: number;
  productId: number;
  productName: string;
  slotNumber?: number;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface OrderMachineOption {
  id: number;
  name: string;
  serialNumber: string;
  locationName?: string;
}

export interface Order {
  id: number;
  orderCode: string;
  machineId: number;
  machineName: string;
  machineSerial?: string;
  productName: string;
  items: OrderLineItem[];
  amount: number;
  status: OrderStatus;
  createdAt: string;
  refundVoucherCode?: string | null;
}

export interface OrderFilterParams {
  date?: string;
  machineId?: string;
  status?: string;
  keyword?: string;
}

interface OrderItemDto {
  id?: number;
  productId: number;
  productName?: string;
  slotNumber?: number;
  quantity: number;
  unitPrice?: number | string;
  subtotal?: number | string;
}

interface OrderDto {
  id: number;
  orderCode: string;
  machineId: number;
  machineName?: string;
  machineSerial?: string;
  totalAmount: number | string;
  paymentStatus: string;
  dispenseStatus: string;
  createdAt: string;
  refundVoucherCode?: string | null;
  items?: OrderItemDto[];
}

interface MachineLookupDto {
  id: number;
  name?: string;
  serialNumber?: string;
  locationName?: string;
  location?: { name?: string } | null;
}

interface ProductLookupDto {
  id: number;
  name?: string;
}

interface ProductPageDto {
  content?: ProductLookupDto[];
  totalPages?: number;
}

function extractProducts(raw: ProductLookupDto[] | ProductPageDto | undefined): ProductLookupDto[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.content)) return raw.content;
  return [];
}

async function fetchAllProducts(): Promise<ProductLookupDto[]> {
  const firstRes = await axiosInstance.get<ProductLookupDto[] | ProductPageDto>(
    '/api/v1/products',
    { params: { page: 0 } }
  );
  const firstData = firstRes.data;
  if (Array.isArray(firstData)) return firstData;

  const products = [...extractProducts(firstData)];
  const totalPages = Math.min(Number(firstData?.totalPages ?? 1), 20);
  if (totalPages <= 1) return products;

  const restRequests = Array.from({ length: totalPages - 1 }, (_, idx) =>
    axiosInstance.get<ProductLookupDto[] | ProductPageDto>('/api/v1/products', {
      params: { page: idx + 1 },
    })
  );

  const restResults = await Promise.allSettled(restRequests);
  for (const res of restResults) {
    if (res.status === 'fulfilled') {
      products.push(...extractProducts(res.value.data));
    }
  }
  return products;
}

function resolveOrderStatus(dto: OrderDto): OrderStatus {
  if (dto.dispenseStatus === 'JAMMED' || dto.dispenseStatus === 'REFUNDED') {
    return 'REFUNDED_JAMMED';
  }
  if (dto.paymentStatus === 'FAILED') {
    return 'PAYMENT_FAILED';
  }
  if (dto.dispenseStatus === 'COMPLETED' || dto.dispenseStatus === 'DISPENSED') {
    return 'SUCCESS';
  }
  if (dto.paymentStatus === 'SUCCESS') {
    return 'DISPENSING';
  }
  return 'PENDING_PAYMENT';
}

function toOrder(
  dto: OrderDto,
  machineMap: Map<number, OrderMachineOption>,
  productMap: Map<number, string>
): Order {
  const machine = machineMap.get(dto.machineId);
  const resolvedMachineName = dto.machineName || machine?.name || `Máy #${dto.machineId}`;
  const resolvedMachineSerial = dto.machineSerial || machine?.serialNumber;

  const items: OrderLineItem[] = (dto.items ?? []).map((item) => {
    const resolvedProductName =
      item.productName || productMap.get(item.productId) || `SP #${item.productId}`;
    return {
      id: item.id,
      productId: item.productId,
      productName: resolvedProductName,
      slotNumber: item.slotNumber,
      quantity: item.quantity,
      unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : undefined,
      subtotal: item.subtotal !== undefined ? Number(item.subtotal) : undefined,
    };
  });

  const productSummary =
    items.map((item) => `${item.productName} × ${item.quantity}`).join(', ') || '—';

  return {
    id: dto.id,
    orderCode: dto.orderCode,
    machineId: dto.machineId,
    machineName: resolvedMachineName,
    machineSerial: resolvedMachineSerial,
    productName: productSummary,
    items,
    amount: Number(dto.totalAmount ?? 0),
    status: resolveOrderStatus(dto),
    createdAt: dto.createdAt,
    refundVoucherCode: dto.refundVoucherCode ?? null,
  };
}

export const orderService = {
  async getMachines(): Promise<OrderMachineOption[]> {
    const { data } = await axiosInstance.get<MachineLookupDto[]>('/api/v1/machines');
    if (!Array.isArray(data)) return [];
    return data.map((m) => ({
      id: m.id,
      name: m.name || `Máy #${m.id}`,
      serialNumber: m.serialNumber || `ID-${m.id}`,
      locationName: m.location?.name || m.locationName,
    }));
  },

  async getOrders(params?: OrderFilterParams): Promise<Order[]> {
    const [ordersRes, machinesRes, productsRes] = await Promise.allSettled([
      axiosInstance.get<OrderDto[]>('/api/v1/orders'),
      axiosInstance.get<MachineLookupDto[]>('/api/v1/machines'),
      fetchAllProducts(),
    ]);

    if (ordersRes.status === 'rejected') {
      throw ordersRes.reason;
    }

    const machineMap = new Map<number, OrderMachineOption>();
    if (machinesRes.status === 'fulfilled' && Array.isArray(machinesRes.value.data)) {
      for (const m of machinesRes.value.data) {
        machineMap.set(m.id, {
          id: m.id,
          name: m.name || `Máy #${m.id}`,
          serialNumber: m.serialNumber || `ID-${m.id}`,
          locationName: m.location?.name || m.locationName,
        });
      }
    }

    const productMap = new Map<number, string>();
    if (productsRes.status === 'fulfilled') {
      for (const p of productsRes.value) {
        if (p.id != null && p.name) {
          productMap.set(p.id, p.name);
        }
      }
    }

    const rawOrders = Array.isArray(ordersRes.value.data) ? ordersRes.value.data : [];
    let orders = rawOrders
      .map((dto) => toOrder(dto, machineMap, productMap))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (params?.date) {
      orders = orders.filter((o) => o.createdAt?.slice(0, 10) === params.date);
    }

    if (params?.machineId) {
      const target = params.machineId.trim().toLowerCase();
      orders = orders.filter(
        (o) =>
          String(o.machineId) === target ||
          o.machineName.toLowerCase().includes(target) ||
          (o.machineSerial ?? '').toLowerCase().includes(target)
      );
    }

    if (params?.status) {
      orders = orders.filter((o) => o.status === params.status);
    }

    if (params?.keyword) {
      const kw = params.keyword.trim().toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderCode.toLowerCase().includes(kw) ||
          o.machineName.toLowerCase().includes(kw) ||
          (o.machineSerial ?? '').toLowerCase().includes(kw) ||
          o.productName.toLowerCase().includes(kw)
      );
    }

    return orders;
  },
};