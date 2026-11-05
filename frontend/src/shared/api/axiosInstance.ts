import axios, { AxiosError } from "axios";
import { useAuthStore } from "../../features/auth/authStore";
import { toast } from "sonner"; // Thêm thư viện hiển thị thông báo

// Ưu tiên cấu hình API của FE2, hỗ trợ cả biến môi trường FE1
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080";

// Axios dùng cho các API cần đăng nhập
export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Axios dùng cho API công khai như Login
export const publicAxios = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// REQUEST INTERCEPTOR
// Tự động lấy token từ Zustand và gắn Bearer token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
// Nâng cấp: Tự động xử lý lỗi 401 và hiển thị Toast cho các lỗi khác
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    // 1. Xử lý mất phiên đăng nhập (401)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();

      if (window.location.pathname !== "/login") {
        toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
        window.location.replace("/login");
      }
      
      return Promise.reject(error);
    }

    // 2. Tự động Toast các lỗi khác (400, 403, 500...) từ Backend
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Lỗi kết nối đến máy chủ. Vui lòng thử lại!";

    // Chỉ hiện toast nếu không phải ở màn hình Kiosk (để không làm phiền khách mua hàng)
    if (!window.location.pathname.includes('/kiosk')) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;