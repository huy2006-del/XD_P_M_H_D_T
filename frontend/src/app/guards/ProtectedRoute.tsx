
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/authStore";

export default function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const userProfile = useAuthStore((state) => state.userProfile);
  const location = useLocation();

  if (!token || !userProfile) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}
