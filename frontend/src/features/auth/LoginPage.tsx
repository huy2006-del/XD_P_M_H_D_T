import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, USE_MOCK_AUTH } from "./authService";
import { useAuthStore } from "./authStore";
import type { UserRole } from "./authTypes";
import {
  Apple,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  LoaderCircle,
  CircleAlert,
} from "lucide-react";
import "./LoginPage.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const getRedirectPath = (role: UserRole) => {
    if (role === "ADMIN") {
      return "/admin/dashboard";
    }

    return "/operator/dashboard";
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const result = await login({
        username: username.trim(),
        password,
      });

      // Lưu token và thông tin người dùng vào Zustand.
      setAuth(result.token, result.user);

      // Điều hướng theo vai trò.
      navigate(getRedirectPath(result.user.role), {
        replace: true,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">
            <Apple size={36} strokeWidth={2.2} />
          </div>

          <h1>FreshVend</h1>
          <p>IOT SMART MANAGEMENT</p>
        </div>

        <div className="login-card">
          <p className="login-subtitle">
            Sign in to your FreshVend account
          </p>

          <form onSubmit={handleLogin} noValidate>
            <div className="login-field">
              <label htmlFor="username">Username</label>

              <div className="login-input-wrapper">
                <UserRound size={19} />

                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>

              <div className="login-input-wrapper">
                <LockKeyhole size={19} />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="login-eye-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <CircleAlert size={17} />
                <span>{error}</span>
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="login-spinner"
                  />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {USE_MOCK_AUTH && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                Development Mode – Mock Authentication
              </p>
            )}
          </form>
        </div>

        <p className="login-footer">
          © 2026 FreshVend Systems. All rights reserved.
        </p>
      </div>
    </div>
  );
}