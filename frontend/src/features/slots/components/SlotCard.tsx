
import { useEffect, useState } from "react";
import type { MachineSlot } from "../slotTypes";
import {
  getSlotInventory,
  type SlotInventoryItem,
} from "../services/slotService";

type SlotCardProps = {
  slot: MachineSlot;
  onConfigure: (slot: MachineSlot) => void;
};

// Emoji dự phòng khi ảnh không tải được
function getFruitIcon(name: string | null) {
  const text = (name ?? "").toLowerCase();

  if (text.includes("tao") || text.includes("táo")) {
    return "🍎";
  }

  if (text.includes("cam")) {
    return "🍊";
  }

  if (text.includes("le") || text.includes("lê")) {
    return "🍐";
  }

  return "📦";
}

// Ảnh trái cây trong thư mục public/fruits
function getFruitImage(name: string | null): string | null {
  const text = (name ?? "").toLowerCase();

  if (text.includes("tao") || text.includes("táo")) {
    return "/fruits/apple.png";
  }

  if (text.includes("cam")) {
    return "/fruits/orange.png";
  }

  if (text.includes("le") || text.includes("lê")) {
    return "/fruits/pear.png";
  }

  return null;
}

// Định dạng ngày yyyy-mm-dd thành dd/mm/yyyy
function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default function SlotCard({
  slot,
  onConfigure,
}: SlotCardProps) {
  const [inventory, setInventory] = useState<SlotInventoryItem[]>([]);
  const [inventoryError, setInventoryError] = useState(false);

  // Ưu tiên ảnh Backend, sau đó ảnh frontend
  const imageUrl =
    slot.productImageUrl || getFruitImage(slot.productName);

  // Lưu URL ảnh đang hiển thị để xử lý ảnh lỗi
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const showImage = imageUrl !== null && imageUrl !== failedImageUrl;

  const fruitIcon = getFruitIcon(slot.productName);

  // Lấy danh sách lô hàng của khay
  useEffect(() => {
    let active = true;

    if (slot.currentStock <= 0) {
      return () => {
        active = false;
      };
    }

    getSlotInventory(slot.slotId)
      .then((data) => {
        if (active) {
          setInventory(data);
          setInventoryError(false);
        }
      })
      .catch(() => {
        if (active) {
          setInventory([]);
          setInventoryError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [slot.slotId, slot.currentStock]);

  // Tính phần trăm tồn kho
  const capacity = Math.max(slot.capacity, 1);

  const percent = Math.min(
    100,
    Math.max(0, (slot.currentStock / capacity) * 100)
  );

  // Quy tắc màu:
  // 0%       : đỏ
  // 1% - 40% : cam
  // > 40%    : xanh
  const stockClass =
    slot.currentStock === 0
      ? "empty"
      : percent <= 40
        ? "low"
        : "good";

  // Tìm lô có hạn sử dụng gần nhất
  const nearestExpiry = [...inventory].sort(
    (a, b) => a.expiryDate.localeCompare(b.expiryDate)
  )[0];

  return (
    <article className="fv-slot-card">
      {/* Mã khay và trạng thái */}
      <div className="fv-slot-top">
        <strong>{slot.slotCode}</strong>
        <span className="fv-slot-status">
          {slot.status}
        </span>
      </div>

      {/* Ảnh trái cây */}
      <div className="fv-slot-image">
        {showImage ? (
          <img
            src={imageUrl ?? undefined}
            alt={slot.productName ?? "Trái cây"}
            onError={() => {
              setFailedImageUrl(imageUrl);
            }}
          />
        ) : (
          <span>{fruitIcon}</span>
        )}
      </div>

      {/* Tên sản phẩm */}
      <h3>
        {slot.productName ?? "Chưa gán sản phẩm"}
      </h3>

      {/* Số lượng tồn kho */}
      <div className="fv-slot-stock">
        <span>Tồn kho</span>
        <strong>
          {slot.currentStock}/{slot.capacity}
        </strong>
      </div>

      {/* Thanh Progress Bar */}
      <div className="fv-slot-progress">
        <div
          className={`fv-slot-progress-fill ${stockClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Hạn sử dụng */}
      {slot.currentStock > 0 && (
        <div className="fv-slot-expiry">
          <span>
            {nearestExpiry
              ? `HSD gần nhất: ${formatDate(
                  nearestExpiry.expiryDate
                )}`
              : inventoryError
                ? "Không tải được hạn sử dụng"
                : "Đang tải hạn sử dụng..."}
          </span>

          {/* Tooltip danh sách Batch */}
          {inventory.length > 0 && (
            <div
              className="fv-slot-tooltip"
              role="tooltip"
            >
              <strong>Thông tin lô hàng</strong>

              {inventory.map((item) => (
                <div key={item.batchId}>
                  <p>Mã lô: {item.batchCode}</p>
                  <p>Số lượng: {item.quantity}</p>
                  <p>
                    HSD: {formatDate(item.expiryDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nút mở modal cấu hình */}
      <button
        type="button"
        className="fv-slot-config-button"
        onClick={() => onConfigure(slot)}
      >
        ⚙ Cấu hình
      </button>
    </article>
  );
}
