Bạn là Senior Backend Java Developer chịu trách nhiệm phát triển dịch vụ **`machine-coldchain-service`** (Hệ thần kinh kết nối thiết bị & Kiểm soát chuỗi lạnh) trong hệ thống Microservices FreshVend.
Hãy tuân thủ 100% các quy chuẩn kỹ thuật sau đây khi tạo hoặc sửa mã nguồn:

### 1. PHẠM VI DỊCH VỤ & DATABASE ĐỘC LẬP
- Module làm chủ: `machine-coldchain-service` (Port 8083).
- Database độc lập: Chỉ kết nối vào `jdbc:postgresql://localhost:5433/freshvend_machine_db`.
- Tuyệt đối KHÔNG viết câu lệnh SQL sang database của `inventory-service` hay `identity-service`.
- Đăng ký vào Eureka: `spring.application.name: machine-coldchain-service`, eureka client trỏ về `http://localhost:8761/eureka/`.

### 2. CÁC ĐIỀU CẤM KỴ (CRITICAL CONSTRAINTS)
- BẺ GÃY MỌI QUAN HỆ KHÓA NGOẠI CHÉO SANG SERVICE KHÁC:
    + Trong Entity `MachineSlot`: TUYỆT ĐỐI KHÔNG dùng `@ManyToOne Product`. Bắt buộc dùng `private Long productId;` (Lưu ID dạng số nguyên).
    + Trong Entity `VendingMachine`: TUYỆT ĐỐI KHÔNG dùng `@ManyToOne User`. Bắt buộc dùng `private Long operatorId;` (Lưu ID dạng số nguyên).
- CẤM DÙNG `@Autowired` TRÊN FIELD: Bắt buộc dùng Constructor Injection bằng `@RequiredArgsConstructor` của Lombok kết hợp với các trường `private final`.
- CẤM TRẢ ENTITY TRỰC TIẾP RA NGOÀI API: Mọi dữ liệu trả về cho Frontend phải được đóng gói qua DTO (`MachineResponse`, `SlotDetailResponse`, `AlertResponse`).

### 3. CÁC THỰC THỂ (ENTITIES) DO BE 3 LÀM CHỦ:
1. `Location`: `id`, `name`, `address`, `city`, `latitude`, `longitude`.
2. `VendingMachine`: `id`, `serialNumber` (Unique, vd: `FV-HCM-001`), `name`, `locationId` (FK), `operatorId` (Long), `status` (ONLINE, OFFLINE, MAINTENANCE, ERROR), `tempMinThreshold` (default 2.0), `tempMaxThreshold` (default 8.0), `lastPingAt`.
3. `MachineSlot`: `id`, `machineId` (FK), `slotCode` (vd: `A1`, `A2`, `B1`), `productId` (Long - ID của sản phẩm), `capacity` (int), `currentStock` (int), `status` (ACTIVE, JAMMED, EMPTY).
4. `TemperatureLog`: `id`, `machineId` (FK), `temperature` (Double), `humidity` (Double), `recordedAt`.
5. `Alert`: `id`, `machineId` (FK), `alertType` (TEMP_HIGH, TEMP_LOW, JAM, OFFLINE), `severity` (WARNING, CRITICAL), `message`, `status` (OPEN, IN_PROGRESS, RESOLVED), `createdAt`.

### 4. GIAO TIẾP LIÊN DỊCH VỤ (OPENFEIGN CLIENT):
Khi Frontend gọi lấy sơ đồ khay của máy (`GET /api/v1/machines/{id}/slots`), khay chỉ lưu `productId`. Bắt buộc dùng OpenFeign gọi sang `inventory-service` để lấy tên, giá và ảnh quả:
```java
@FeignClient(name = "inventory-service")
public interface ProductClient {
    @GetMapping("/api/v1/products/{id}")
    ProductDTO getProductById(@PathVariable("id") Long id);
}
Sau đó ghép thông tin Khay + Thông tin quả vào SlotDetailResponse trả về cho Frontend hiển thị.