
import { publicAxios } from "../../shared/api/axiosInstance";
import type { UserProfile } from "./authTypes";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

// Chỉ bật Mock API trong môi trường development.
const USE_MOCK_AUTH =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_MOCK_AUTH === "true";

// Dữ liệu chỉ dùng để kiểm thử giao diện.
const mockUsers = [
  {
    username: "admin",
    password: "admin123",
    user: {
      id: "1",
      username: "admin",
      role: "ADMIN",
    } satisfies UserProfile,
  },
  {
    username: "operator",
    password: "operator123",
    user: {
      id: "2",
      username: "operator",
      role: "OPERATOR",
    } satisfies UserProfile,
  },
];

async function mockLogin(
  credentials: LoginRequest
): Promise<LoginResponse> {
  // Giả lập độ trễ mạng để kiểm thử loading.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 600);
  });

  const account = mockUsers.find(
    (item) =>
      item.username === credentials.username.trim() &&
      item.password === credentials.password
  );

  if (!account) {
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
  }

  return {
    token: `mock-token-${account.user.role.toLowerCase()}`,
    user: account.user,
  };
}

export async function login(
  credentials: LoginRequest
): Promise<LoginResponse> {
  if (USE_MOCK_AUTH) {
    return mockLogin(credentials);
  }

  // Endpoint và response này là giả định tạm thời.
  // Cần đối chiếu Swagger/API contract của Backend.
  const response = await publicAxios.post<LoginResponse>(
    "/api/v1/auth/login",
    credentials
  );

  return response.data;
}

export { USE_MOCK_AUTH };
