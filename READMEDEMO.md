FRESHVEND — HƯỚNG DẪN DEMO RABBITMQ ACK

1. Mục tiêu demo

Nhiệm vụ: Gửi lệnh nhả hàng bình thường, chiếu log Console Backend và chứng minh message được RabbitMQ loại khỏi Queue sau khi Consumer gửi basic.ack.

Luồng xử lý:

API Gateway → RabbitMQ → DispenseConsumer → Giả lập nhả hàng → basic.ack → Queue trống

Lưu ý: Demo này không yêu cầu kiểm tra trừ tồn kho PostgreSQL.

2. Chuẩn bị môi trường

Thành phần

Cổng

Yêu cầu

Eureka Discovery

8761

Đang chạy

API Gateway

8080

Đang chạy

Machine Coldchain Service

8083

Đang chạy

RabbitMQ AMQP

5672

Đang chạy

RabbitMQ Management

15672

Đang chạy

PostgreSQL

5433

Đang chạy

Mở Docker Desktop, sau đó tại thư mục gốc dự án chạy:

docker compose up -d
docker compose ps

Nếu Backend chưa chạy, mở ba Terminal tại thư mục backend:

Terminal Eureka:

mvn -pl discovery-server spring-boot:run

Terminal Gateway:

mvn -pl api-gateway spring-boot:run

Terminal Machine Service:

mvn -pl machine-coldchain-service spring-boot:run

Giữ nguyên các Terminal Backend trong suốt quá trình demo.

3. Bước 1 — Mở RabbitMQ Management

Truy cập:

http://localhost:15672

Vào Queues and Streams → dispense.command.queue.

Quan sát ba chỉ số:

Ready: Message chờ Consumer.

Unacked: Message đã giao cho Consumer nhưng chưa được xác nhận.

Total: Tổng message trong Queue.

Trước khi gửi lệnh, nếu Queue trống:

Ready   = 0
Unacked = 0
Total   = 0

Lời nói: "Đây là Queue tiếp nhận lệnh nhả hàng. Trước khi gửi lệnh, Queue đang trống."

4. Bước 2 — Mở Terminal theo dõi Queue

Mở PowerShell mới và chạy:

while ($true) {
    docker exec freshvend_rabbitmq rabbitmqctl list_queues `
        name messages_ready messages_unacknowledged messages `
        --formatter=table |
        Select-String "dispense.command.queue"

    Start-Sleep -Milliseconds 300
}

Giữ Terminal này chạy liên tục.

Kết quả ban đầu:

dispense.command.queue  0  0  0
dispense.command.queue  0  0  0

Thứ tự ba số là: Ready — Unacked — Total.

5. Bước 3 — Chuẩn bị Console Backend

Mở Terminal đang chạy machine-coldchain-service tại cổng 8083.

Đây là nơi quan sát log của DispenseConsumer.

Không nhập lệnh POST vào Terminal đang chạy Backend.

6. Bước 4 — Gửi lệnh nhả hàng

Mở một PowerShell mới và chạy nguyên đoạn:

$orderId = "DEMO-ACK-" + [guid]::NewGuid().ToString("N").Substring(0,8)

$body = @{
    orderId = $orderId
    machineId = "1"
    slotId = "A1"
    simulateJam = $false
} | ConvertTo-Json

Write-Host "Order ID: $orderId"

Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/dispense" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Output mong đợi:

Order ID: DEMO-ACK-xxxxxxxx

orderId             status
-------             ------
DEMO-ACK-xxxxxxxx   QUEUED

Giải thích:

simulateJam=false: Giả lập nhả hàng bình thường, không chủ động gây lỗi kẹt động cơ.

QUEUED: Backend đã tiếp nhận lệnh.

orderId: Tạo mới mỗi lần chạy để tránh lỗi đơn hàng trùng.

Lời nói: "Em gửi một lệnh nhả hàng bình thường qua API Gateway. Message được chuyển vào RabbitMQ để Consumer xử lý."

7. Bước 5 — Chiếu log Backend

Chuyển sang Console machine-coldchain-service.

Tìm log của cùng orderId vừa gửi.

Các log cần quan sát (tên có thể khác đôi chút theo phiên bản code):

[DISPENSE QUEUED] orderId=DEMO-ACK-xxxxxxxx
[MOTOR ROTATING] ...
[SENSOR] ...
[DISPENSED] ...
[ACK SENT] SUCCESS | orderId=DEMO-ACK-xxxxxxxx

Ý nghĩa:

Backend tiếp nhận lệnh nhả hàng.

Consumer nhận message.

Hệ thống giả lập động cơ Servo.

Nhả hàng thành công.

Consumer gửi basic.ack.

Quan trọng: Không sử dụng log sau làm minh chứng nhả hàng thành công:

[DUPLICATE DISPENSE IGNORED]
[ACK SENT] Duplicate ignored

Đây là ACK cho message có orderId bị trùng.

Lời nói: "Consumer đã nhận lệnh, giả lập động cơ nhả hàng và xử lý thành công. Sau đó Consumer gửi ACK đến RabbitMQ."

8. Bước 6 — Chứng minh message biến mất

Quay lại Terminal theo dõi RabbitMQ ở Bước 2.

Kết quả mong đợi:

dispense.command.queue  0  0  0
dispense.command.queue  0  1  1
dispense.command.queue  0  1  1
dispense.command.queue  0  0  0

Trạng thái

Ready

Unacked

Total

Ý nghĩa

Trước gửi

0

0

0

Queue trống

Đang xử lý

0

1

1

Consumer đã nhận message, chưa ACK

Sau ACK

0

0

0

RabbitMQ loại message đã xác nhận khỏi Queue

Lời nói: "Khi Consumer xử lý, Unacked tăng lên 1. Sau khi Consumer gửi basic.ack, Unacked giảm về 0, đồng thời Total trở về 0. Điều này chứng minh RabbitMQ đã loại message sau khi nhận ACK."

Lưu ý: Terminal có thể không bắt được Unacked = 1 nếu việc kiểm tra diễn ra không đúng lúc. Đây không tự động là lỗi ACK.

9. Bước 7 — Chiếu RabbitMQ Management

Quay lại:

http://localhost:15672

Mở Queue dispense.command.queue.

Sau khi xử lý hoàn tất, quan sát:

Ready   = 0
Unacked = 0
Total   = 0

Trong phần Message rates, có thể thấy các hoạt động:

Publish: Message được gửi vào.

Consumer ack: Consumer đã gửi xác nhận.

Biểu đồ Queued messages có thể không xuất hiện đỉnh vì thời gian xử lý ngắn hơn chu kỳ cập nhật thống kê.

Lời nói: "Trên RabbitMQ Management, Queue hiện không còn message và biểu đồ Consumer ack ghi nhận hoạt động xác nhận."

10. Thứ tự chuyển màn hình khi demo

RabbitMQ Management: Giới thiệu Queue ban đầu trống.

Terminal theo dõi: Bắt đầu quan sát Ready, Unacked, Total.

PowerShell gửi API: Gửi lệnh POST /api/v1/dispense.

Console Machine Service: Chiếu quá trình nhả hàng và ACK thành công.

Terminal theo dõi: Chỉ ra Unacked: 1 → 0.

RabbitMQ Management: Chỉ ra Queue đã trống, Total = 0.

11. Kịch bản thuyết trình ngắn

"Trong phần demo này, em trình bày cơ chế Message Acknowledgment của RabbitMQ.

Đầu tiên, em gửi một lệnh nhả hàng bình thường với simulateJam=false qua API Gateway.

RabbitMQ chuyển message đến Consumer của Machine Service. Trong quá trình xử lý, trạng thái Unacked bằng 1, nghĩa là Consumer đã nhận message nhưng chưa xác nhận hoàn thành.

Backend thực hiện giả lập động cơ và ghi nhận nhả hàng thành công. Sau đó Consumer gửi basic.ack đến RabbitMQ.

Ngay khi ACK được xử lý, Unacked giảm về 0 và Queue không còn message.

Như vậy, hệ thống chứng minh được việc RabbitMQ loại message khỏi Queue sau khi nhận xác nhận từ Consumer, thay vì xóa message ngay khi vừa giao."