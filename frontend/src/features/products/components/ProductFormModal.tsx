import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';   // ← gộp
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { ImageUploadField } from './ImageUploadField';
import {
  PRODUCT_UNITS,
  Product,
  ProductUpsertPayload,
} from '../types/product.types';

const schema = z
  .object({
    name: z.string().trim().min(1, 'Tên không được rỗng').max(200, 'Tên quá dài'),
    sku: z.string().trim().min(1, 'SKU không được rỗng').max(50),
    price: z.coerce.number({ invalid_type_error: 'Đơn giá phải là số' })
      .positive('Đơn giá phải là số dương'),
    unit: z.enum(['kg', 'hộp', 'quả', 'phần']),
    imageUrl: z
      .string()
      .trim()
      .url('URL ảnh không hợp lệ')
      .or(z.literal(''))
      .optional(),
    shelfLifeDays: z.coerce.number({ invalid_type_error: 'Hạn sử dụng phải là số' })
      .int('Phải là số nguyên')
      .positive('Hạn sử dụng phải > 0'),
    minTempC: z.coerce.number({ invalid_type_error: 'Nhiệt độ phải là số' }),
    maxTempC: z.coerce.number({ invalid_type_error: 'Nhiệt độ phải là số' }),
    description: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.minTempC < d.maxTempC, {
    message: 'Nhiệt độ tối thiểu phải nhỏ hơn nhiệt độ tối đa',
    path: ['minTempC'],
  });

type FormValues = z.infer<typeof schema>;

interface ProductFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  product?: Product | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ProductUpsertPayload) => void | Promise<void>;
}

const defaultValues: FormValues = {
  name: '',
  sku: '',
  price: 0,
  unit: 'hộp',
  imageUrl: '',
  shelfLifeDays: 7,
  minTempC: 2,
  maxTempC: 8,
  description: '',
};

export const ProductFormModal = ({
  open,
  mode,
  product,
  submitting,
  onClose,
  onSubmit,
}: ProductFormModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    control,                                  // ← THÊM
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });

  // Reset khi mở modal / đổi sản phẩm
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && product) {
      reset({
        name: product.name,
        sku: product.sku,
        price: product.price,
        unit: product.unit,
        imageUrl: product.imageUrl ?? '',
        shelfLifeDays: product.shelfLifeDays,
        minTempC: product.minTempC,
        maxTempC: product.maxTempC,
        description: product.description ?? '',
      });
    } else {
      reset(defaultValues);
    }
  }, [open, mode, product, reset]);

  // ← ĐÃ XÓA: const imageUrl = watch('imageUrl');

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      sku: values.sku,
      price: values.price,
      unit: values.unit,
      imageUrl: values.imageUrl ?? '',
      shelfLifeDays: values.shelfLifeDays,
      minTempC: values.minTempC,
      maxTempC: values.maxTempC,
      description: values.description,
    });
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={mode === 'create' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}
      description="Thông tin sản phẩm phục vụ bảo quản chuỗi lạnh."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting || isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" form="product-form" loading={submitting || isSubmitting}>
            {mode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
          </Button>
        </div>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tên */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tên sản phẩm <span className="text-red-500">*</span>
          </label>
          <Input placeholder="VD: Hộp trái cây mix Deluxe" invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* SKU */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            SKU <span className="text-red-500">*</span>
          </label>
          <Input placeholder="VD: FRUIT-MIX-01" invalid={!!errors.sku} {...register('sku')} />
          {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku.message}</p>}
        </div>

        {/* Đơn vị */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Đơn vị <span className="text-red-500">*</span>
          </label>
          <select
            {...register('unit')}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Giá */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Đơn giá (VND) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min={0}
            step={1000}
            invalid={!!errors.price}
            {...register('price', { valueAsNumber: true })}
          />
          {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
        </div>

        {/* Hạn sử dụng */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Hạn sử dụng (ngày) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min={1}
            invalid={!!errors.shelfLifeDays}
            {...register('shelfLifeDays', { valueAsNumber: true })}
          />
          {errors.shelfLifeDays && (
            <p className="mt-1 text-xs text-red-500">{errors.shelfLifeDays.message}</p>
          )}
        </div>

        {/* Nhiệt độ min/max */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nhiệt độ tối thiểu Tmin (°C) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step={0.5}
            invalid={!!errors.minTempC}
            {...register('minTempC', { valueAsNumber: true })}
          />
          {errors.minTempC && <p className="mt-1 text-xs text-red-500">{errors.minTempC.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nhiệt độ tối đa Tmax (°C) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step={0.5}
            invalid={!!errors.maxTempC}
            {...register('maxTempC', { valueAsNumber: true })}
          />
          {errors.maxTempC && <p className="mt-1 text-xs text-red-500">{errors.maxTempC.message}</p>}
        </div>

        {/* Ảnh — dùng Controller vì ImageUploadField không phải HTML input gốc */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Ảnh sản phẩm
          </label>
          <Controller
            control={control}
            name="imageUrl"
            render={({ field, fieldState }) => (
              <ImageUploadField
                value={field.value ?? ''}
                onChange={field.onChange}
                invalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
              />
            )}
          />
        </div>

        {/* Mô tả */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
          <textarea
            rows={3}
            placeholder="Thành phần, khối lượng, ghi chú…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            {...register('description')}
          />
        </div>
      </form>
    </Modal>
  );
};
