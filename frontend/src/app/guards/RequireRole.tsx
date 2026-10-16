
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../features/auth/authStore";
import type { UserRole } from "../../features/auth/authTypes";

interface RequireRoleProps {
  allowedRoles: UserRole[];
}

export default function RequireRole({
  allowedRoles,
}: RequireRoleProps) {
  const role = useAuthStore((state) => state.role);

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
