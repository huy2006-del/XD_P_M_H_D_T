
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile, UserRole } from "./authTypes";

// Định nghĩa dữ liệu và các hàm của Auth Store
interface AuthState {
  token: string | null;
  userProfile: UserProfile | null;
  role: UserRole | null;

  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
}

// Tạo Auth Store bằng Zustand
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Trạng thái ban đầu: chưa đăng nhập
      token: null,
      userProfile: null,
      role: null,

      // Đăng nhập thành công
      setAuth: (token, user) => {
        set({
          token: token,
          userProfile: user,
          role: user.role,
        });
      },

      // Đăng xuất
      logout: () => {
        set({
          token: null,
          userProfile: null,
          role: null,
        });
      },
    }),
    {
      name: "freshvend-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
