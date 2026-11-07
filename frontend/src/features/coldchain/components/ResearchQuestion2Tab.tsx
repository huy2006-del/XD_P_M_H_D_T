import React from 'react';
import { HelpCircle, Clock, Zap, ShieldCheck, RefreshCw, GitFork } from 'lucide-react';

export const ResearchQuestion2Tab: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div className="border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" /> Báo Cáo Nghiên Cứu Kiến Trúc Hệ Thống (Phản Biện 24h)
        </div>
        <h2 className="text-xl md:text-2xl font-black text-gray-900 mt-1">
          Câu Hỏi Nghiên Cứu 2: Tại Sao Phải Dùng Message Queue / Kafka Thay Vì Gửi REST Trực Tiếp?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          So sánh đối chứng giữa Direct Synchronous REST và Message-Driven Architecture trong hệ thống FreshVend.
        </p>
      </div>

      {/* 5 LÝ DO CỐT LÕI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Clock className="w-4 h-4 text-blue-600" /> 1. Tách Biệt Thời Gian (Temporal Decoupling)
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            REST đòi hỏi 2 service phải cùng sống cùng lúc. Khi dùng Kafka/RabbitMQ, nếu Database bảo trì 2 tiếng, bản tin cảm biến vẫn nằm an toàn trong Queue, không bao giờ mất dữ liệu.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Zap className="w-4 h-4 text-amber-600" /> 2. San Phẳng Đỉnh Tải (Peak Shaving)
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Giờ cao điểm 1.000 khách mua cùng lúc sẽ đánh sập DB nếu dùng REST. Queue đóng vai trò đập ngăn lũ, Consumer kéo tin nhắn đều đặn 50 đơn/giây, hệ thống luôn êm ái.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 3. Cách Ly Lỗi (Fault Isolation)
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Dịch vụ gửi email hoá đơn hoặc lưu trữ lịch sử bị lỗi rớt mạng hoàn toàn không ảnh hưởng tới lệnh nhả hoa quả và thanh toán của khách hàng tại Kiosk.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <RefreshCw className="w-4 h-4 text-purple-600" /> 4. Bất Đồng Bộ Siêu Nhanh (Async Speed)
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Client nhận phản hồi chỉ trong <b>50ms</b> sau khi tin nhắn vào queue, thay vì phải đợi 4-5 giây qua chuỗi REST tuần tự (Order → Payment → Inventory → Hardware → Email).
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <GitFork className="w-4 h-4 text-indigo-600" /> 5. Mở Rộng Không Sửa Code Cũ (Event-Driven Fan-out)
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Khi cần thêm chức năng cảnh báo AI phân tích chuỗi lạnh, chỉ cần tạo Consumer Group mới subscribe vào Kafka Topic <code className="text-indigo-600 font-mono font-bold">machine-telemetry-stream</code> mà không phải sửa hay restart bất kỳ microservice nào đang chạy!
          </p>
        </div>
      </div>

      {/* BẢNG SO SÁNH ĐỐI KHÁNG */}
      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <th className="p-3 font-bold">Tiêu chí so sánh</th>
              <th className="p-3 font-bold text-red-600">Gọi Trực Tiếp Qua REST (Đồng bộ)</th>
              <th className="p-3 font-bold text-emerald-600">Qua Kafka / RabbitMQ (Bất đồng bộ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            <tr>
              <td className="p-3 font-semibold">Khớp nối (Coupling)</td>
              <td className="p-3">Khớp nối chặt (Tightly coupled về IP, Port, Uptime)</td>
              <td className="p-3 font-medium text-emerald-700">Khớp nối lỏng (Loosely coupled theo Message Contract)</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">Khi Service đích sập</td>
              <td className="p-3 text-red-600 font-medium">Lỗi kết nối ngay lập tức, đơn hàng bị hủy bỏ</td>
              <td className="p-3 font-medium text-emerald-700">Lưu an toàn trong Queue/Log, chờ hồi sinh để xử lý tiếp</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">Khả năng chịu tải đột biến</td>
              <td className="p-3 text-red-600 font-medium">Dễ nghẽn connection pool, sụp đổ dây chuyền</td>
              <td className="p-3 font-medium text-emerald-700">San phẳng đỉnh tải (Peak Shaving), bảo vệ DB an toàn</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">Thời gian phản hồi</td>
              <td className="p-3">Chậm (Bằng tổng thời gian cả chuỗi service: 3 - 5s)</td>
              <td className="p-3 font-medium text-emerald-700">Siêu tốc (Chỉ mất 2ms để đẩy tin nhắn vào hàng đợi)</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">Thêm tính năng mới</td>
              <td className="p-3">Phải sửa đổi và redeploy lại các service cũ</td>
              <td className="p-3 font-medium text-emerald-700">Tạo thêm Consumer mới mà không chạm 1 dòng code cũ</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};