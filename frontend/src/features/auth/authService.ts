import { publicAxios } from "../../shared/api/axiosInstance";
import type { UserProfile, UserRole } from "./authTypes";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

interface RawLoginResponse {
  token?: string;
  user?: {
    id?: string | number;
    username?: string;
    role?: string;
  };
}

// Giữ export hằng số để đảm bảo tương thích với các component đang import (luôn dùng API thật)
export const USE_MOCK_AUTH = false;

function normalizeRole(role?: string): UserRole {
  const normalized = role?.trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "OPERATOR") {
    return normalized;
  }
  throw new Error(`Vai trò người dùng không hợp lệ từ Backend: ${role ?? "EMPTY"}`);
}

/**
 * Contract đã đối chiếu với identity-service:
 * POST /api/v1/auth/login -> LoginResponse { token, user: { id, username, role } }
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const payload: LoginRequest = {
    username: credentials.username.trim(),
    password: credentials.password,
  };

  const response = await publicAxios.post<RawLoginResponse>(
    "/api/v1/auth/login",
    payload
  );

  const data = response.data;
  if (!data?.token || !data.user?.username) {
    throw new Error("Phản hồi đăng nhập từ máy chủ không đúng định dạng LoginResponse.");
  }

  return {
    token: data.token,
    user: {
      id: String(data.user.id ?? ""),
      username: data.user.username,
      role: normalizeRole(data.user.role),
    },
  };
}