import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import AdminLayout from "../layouts/adminLayout";
import OperatorLayout from "../layouts/operatorLayout";

import ProtectedRoute from "./guards/ProtectedRoute";
import RequireRole from "./guards/RequireRole";

import LoginPage from "../features/auth/LoginPage";
import { ProductListPage } from "../features/products/pages/ProductListPage";
import { RestockWizardPage } from "../features/restock/pages/RestockWizardPage";
import { ROUTES } from "../shared/constants/routes";
import KioskSimulator from "../features/kiosk/KioskSimulator";
import MachineSlotsPage from "../features/slots/pages/MachineSlotsPage";
import { Link } from "react-router-dom";
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
              {
                path: "machines/:machineId/slots",
                element: <MachineSlotsPage />,
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
                element: (
                  <div className="space-y-4">
                    <h1 className="text-xl font-semibold">Operator Dashboard</h1>
                    <Link
                      to="/operator/restock"
                      className="inline-flex rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
                    >
                      Bắt đầu nạp hàng
                    </Link>
                  </div>
                ),
              },
              {
                path: "restock",
                element: <RestockWizardPage />,
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
