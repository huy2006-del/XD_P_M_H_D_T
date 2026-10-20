import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import AdminLayout from "../layouts/adminLayout";
import OperatorLayout from "../layouts/operatorLayout";

import ProtectedRoute from "./guards/ProtectedRoute";
import RequireRole from "./guards/RequireRole";

import LoginPage from "../features/auth/LoginPage";
import { ProductListPage } from "../features/products/pages/ProductListPage";
import { ROUTES } from "../shared/constants/routes";
import KioskSimulator from "../features/kiosk/KioskSimulator";

// FE3 - Fleet Dashboard
const FleetDashboard = lazy(
  () => import("../features/fleet/pages/FleetDashboard.jsx")
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/kiosk-simulator",
    element: <KioskSimulator />,
  },
  {
    path: "/403",
    element: (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>403 - Access Denied</h1>
        <p>Bạn không có quyền truy cập trang này.</p>
      </div>
    ),
  },

  // Các route yêu cầu đăng nhập
  {
    element: <ProtectedRoute />,
    children: [
      // ADMIN
      {
        element: <RequireRole allowedRoles={["ADMIN"]} />,
        children: [
          {
            path: ROUTES.ADMIN.ROOT,
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: <Navigate to="dashboard" replace />,
              },
              {
                path: "dashboard",
                element: <div>Admin Dashboard</div>,
              },
              {
                path: "products",
                element: <ProductListPage />,
              },
              {
                path: "machines",
                element: (
                  <Suspense
                    fallback={<div>Đang tải danh sách máy...</div>}
                  >
                    <FleetDashboard />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },

      // OPERATOR
      {
        element: <RequireRole allowedRoles={["OPERATOR"]} />,
        children: [
          {
            path: "/operator",
            element: <OperatorLayout />,
            children: [
              {
                index: true,
                element: <Navigate to="dashboard" replace />,
              },
              {
                path: "dashboard",
                element: <div>Operator Dashboard</div>,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    path: "*",
    element: (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>404 - Page Not Found</h1>
      </div>
    ),
  },
]);
