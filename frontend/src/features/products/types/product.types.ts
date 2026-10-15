export type ProductUnit = 'kg' | 'hộp' | 'quả' | 'phần';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  unit: ProductUnit;
  imageUrl: string;
  shelfLifeDays: number;
  minTempC: number;
  maxTempC: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery {
  page: number;   // 0-based cho BE
  size: number;
  keyword?: string;
  isActive?: boolean;
}

export interface ProductUpsertPayload {
  name: string;
  sku: string;
  price: number;
  unit: ProductUnit;
  imageUrl: string;
  shelfLifeDays: number;
  minTempC: number;
  maxTempC: number;
  description?: string;
}

export const PRODUCT_UNITS: ProductUnit[] = ['kg', 'hộp', 'quả', 'phần'];

export const SAFE_TEMP_MIN = 2;
export const SAFE_TEMP_MAX = 8;
