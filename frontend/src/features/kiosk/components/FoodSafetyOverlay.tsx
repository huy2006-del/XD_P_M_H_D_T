import React from 'react';

interface Props {
  isLocked: boolean;
}

export const FoodSafetyOverlay: React.FC<Props> = ({ isLocked }) => {
  if (!isLocked) return null;

  return (
    <div className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/95 text-white p-8 text-center transition-opacity duration-300">
      <div className="mb-8 animate-bounce">
        {/* Biểu tượng cảnh báo */}
        <div className="bg-red-600 rounded-full p-6 shadow-[0_0_40px_rgba(220,38,38,0.6)]">
          <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-widest text-red-500 drop-shadow-lg">
        Tạm ngưng phục vụ
        <br/>vì an toàn thực phẩm
      </h1>
      
      <p className="text-xl md:text-2xl text-slate-300 max-w-4xl leading-relaxed font-medium">
        Nhiệt độ bảo quản lạnh hiện tại không đạt chuẩn. Hệ thống tạm thời khóa để bảo vệ sức khỏe của quý khách.
        <br/><span className="text-white font-bold mt-4 inline-block">Xin vui lòng quay lại sau!</span>
      </p>
    </div>
  );
};
