
import { useEffect, useState } from "react";
import axios from "axios";

import type { MachineSlot } from "../slotTypes";
import {
  getSlotProducts,
  updateMachineSlot,
  type SlotProduct,
} from "../services/slotService";

type Props = {
  slot: MachineSlot;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function SlotConfigModal({
  slot,
  onClose,
  onSaved,
}: Props) {
  const [products, setProducts] = useState<SlotProduct[]>([]);
  const [productId, setProductId] = useState(
    slot.productId === null ? "" : String(slot.productId)
  );
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getSlotProducts()
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách sản phẩm.");
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const hasStock = slot.currentStock > 0;

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedCapacity = Number(capacity);
    const parsedProductId = productId === "" ? null : Number(productId);

    if (
      !Number.isInteger(parsedCapacity) ||
      parsedCapacity < 1 ||
      parsedCapacity > 100
    ) {
      setError("Sức chứa phải là số nguyên từ 1 đến 100.");
      return;
    }

    if (parsedCapacity < slot.currentStock) {
      setError("Sức chứa không được nhỏ hơn tồn kho hiện tại.");
      return;
    }

    if (
      parsedProductId !== null &&
      (!Number.isSafeInteger(parsedProductId) || parsedProductId <= 0)
    ) {
      setError("Sản phẩm không hợp lệ.");
      return;
    }

    if (hasStock && parsedProductId !== slot.productId) {
      setError("Không thể đổi sản phẩm khi khay vẫn còn hàng.");
      return;
    }

    try {
      setSaving(true);

      await updateMachineSlot(slot, parsedProductId, parsedCapacity);
      await onSaved();
      onClose();
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Không thể cập nhật khay."
        : "Đã xảy ra lỗi không xác định.";

      setError(String(message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fv-slot-modal-overlay">
      <div
        className="fv-slot-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fv-slot-modal-title"
      >
        <div className="fv-slot-modal-header">
          <h2 id="fv-slot-modal-title">
            Cấu hình khay {slot.slotCode}
          </h2>
          <button type="button" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <form onSubmit={(event) => void handleSave(event)}>
          <label htmlFor="fv-slot-product">Sản phẩm</label>

          <select
            id="fv-slot-product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={loadingProducts || saving || hasStock}
          >
            <option value="">Chưa gán sản phẩm</option>

            {products
              .filter(
                (product) =>
                  product.isActive ||
                  String(slot.productId) === product.id
              )
              .map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
          </select>

          {hasStock && (
            <p className="fv-slot-modal-hint">
              Khay còn {slot.currentStock} sản phẩm. Không thể đổi
              sản phẩm cho đến khi khay hết hàng.
            </p>
          )}

          <label htmlFor="fv-slot-capacity">Sức chứa tối đa</label>

          <input
            id="fv-slot-capacity"
            type="number"
            min={1}
            max={100}
            step={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            disabled={saving}
            required
          />

          <p className="fv-slot-modal-hint">
            Tồn kho hiện tại: {slot.currentStock} sản phẩm
          </p>

          {error && (
            <p role="alert" className="fv-slot-error">
              {error}
            </p>
          )}

          <div className="fv-slot-modal-actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving || loadingProducts}
              className="fv-slot-save-button"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
