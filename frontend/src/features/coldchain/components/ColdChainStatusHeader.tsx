import React from 'react';
import { ShieldCheck, AlertTriangle, Flame, Volume2, VolumeX, Radio } from 'lucide-react';
import type { ColdChainStatus } from '../types';

interface Props {
  status: ColdChainStatus;
  currentTemp: number;
  currentHumidity: number;
  isMuted: boolean;
  onToggleMute: () => void;
  machineName: string;
}

export const ColdChainStatusHeader: React.FC<Props> = ({
  status,
  currentTemp,
  currentHumidity,
  isMuted,
  onToggleMute,
  machineName,
}) => {
  return (
    <div className="mb-6 space-y-4">
      {/* THẺ ĐÈN BÁO TRẠNG THÁI CHÍNH */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-500 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 ${
          status === 'SAFE'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : status === 'WARNING'
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-red-50 border-red-300 text-red-950 ring-4 ring-red-400/30 animate-pulse'
        }`}
      >
        <div className="flex items-center gap-4 text-center md:text-left">
          {/* Đèn chỉ báo LED */}
          <div className="relative flex items-center justify-center">
            <span
              className={`w-6 h-6 rounded-full inline-block shadow-lg ${
                status === 'SAFE'
                  ? 'bg-emerald-500 shadow-emerald-500/50'
                  : status === 'WARNING'
                  ? 'bg-amber-500 shadow-amber-500/50'
                  : 'bg-red-600 shadow-red-600/50 animate-ping'
              }`}
            />
            <span
              className={`absolute w-3.5 h-3.5 rounded-full ${
                status === 'SAFE' ? 'bg-emerald-200' : status === 'WARNING' ? 'bg-amber-200' : 'bg-white'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                {status === 'SAFE' && `BUỒNG LẠNH AN TOÀN (${machineName})`}
                {status === 'WARNING' && `CẢNH BÁO: NHIỆT ĐỘ TĂNG CAO (${machineName})`}
                {status === 'CRITICAL' && `NGUY CƠ HỎNG HOA QUẢ! (${machineName})`}
              </h2>
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-current shadow-2xs">
                <Radio className="w-3 h-3 text-red-500 animate-pulse" /> LIVE STREAM
              </span>
            </div>

            <p className="text-sm mt-1 opacity-80">
              {status === 'SAFE' &&
                `Nhiệt độ hiện tại ${currentTemp.toFixed(1)}°C đạt chuẩn bảo quản tối ưu cho dâu tây, nho và kiwi (≤8.0°C).`}
              {status === 'WARNING' &&
                `Nhiệt độ ${currentTemp.toFixed(1)}°C vượt ngưỡng khuyến nghị (8.0°C - 10.0°C). Cần theo dõi lốc lạnh.`}
              {status === 'CRITICAL' &&
                `CẢNH BÁO KHẨN CẤP: Nhiệt độ đạt ${currentTemp.toFixed(1)}°C (>10.0°C)! Vi khuẩn sinh sôi, trái cây có nguy cơ thối hỏng trong 30 phút!`}
            </p>
          </div>
        </div>

        {/* Cụm thông số đo và Nút còi hú */}
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-xs px-5 py-3 rounded-xl border border-gray-200/60 shadow-xs">
          <div className="text-right">
            <span className="text-xs text-gray-500 font-medium block">Nhiệt độ đo</span>
            <span
              className={`text-2xl font-black font-mono ${
                status === 'SAFE' ? 'text-emerald-600' : status === 'WARNING' ? 'text-amber-600' : 'text-red-600'
              }`}
            >
              {currentTemp.toFixed(1)}°C
            </span>
          </div>

          <div className="h-8 w-px bg-gray-200" />

          <div className="text-right">
            <span className="text-xs text-gray-500 font-medium block">Độ ẩm</span>
            <span className="text-2xl font-black font-mono text-cyan-600">
              {currentHumidity.toFixed(0)}%
            </span>
          </div>

          {status === 'CRITICAL' && (
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Bật còi báo động' : 'Tắt tiếng còi'}
              className={`ml-2 p-2.5 rounded-xl text-white font-bold transition-all shadow-md flex items-center gap-1.5 text-xs ${
                isMuted
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-red-600 hover:bg-red-700 animate-bounce'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'Đã tắt còi' : 'Còi đang kêu!'}
            </button>
          )}
        </div>
      </div>

      {/* 3 Thẻ tóm tắt ngưỡng an toàn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-800">Dải Nhiệt Độ Chuẩn: 2.0°C - 8.0°C</span>
            <p className="text-gray-500 text-[11px]">Đèn Xanh: Vi sinh vật bị ức chế, hoa quả tươi ngon.</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-800">Ngưỡng Chú Ý: 8.1°C - 10.0°C</span>
            <p className="text-gray-500 text-[11px]">Đèn Vàng: Kiểm tra cánh tủ Kiosk hoặc gioăng cao su.</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-red-100 flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-800">Nguy Cơ Hỏng: &gt; 10.0°C</span>
            <p className="text-gray-500 text-[11px]">Đèn Đỏ Nhấp Nháy + Còi Báo: Tự động ngắt bán hàng!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
