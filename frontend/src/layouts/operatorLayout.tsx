import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Leaf,
  Boxes,
  ArrowDownToLine,
  History,
  LayoutGrid,
  FileWarning,
  AlertTriangle,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import Breadcrumb from "../shared/components/Breadcrumb";
import { useAuthStore } from "../features/auth/authStore";
import { NotificationBell } from "../features/notifications/NotificationBell";
import "./managementLayout.css";

const operatorMenuItems = [
  {
    label: "Quản Lý Lô Hàng",
    path: "/operator/batches",
    icon: Boxes,
  },
  {
    label: "Tiếp Hàng Vào Máy",
    path: "/operator/restock",
    icon: ArrowDownToLine,
  },
  {
    label: "Lịch Sử Tiếp Hàng",
    path: "/operator/restock/history",
    icon: History,
  },
  {
    label: "Sơ Đồ Khay Hàng",
    path: "/operator/machines",
    icon: LayoutGrid,
  },
  {
    label: "Báo Cáo Hao Hụt",
    path: "/operator/reports/spoilage",
    icon: FileWarning,
  },
  {
    label: "Xử Lý Cảnh Báo",
    path: "/operator/alerts",
    icon: AlertTriangle,
  },
];

export default function OperatorLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.userProfile);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="fv-layout">
      {menuOpen && (
        <button
          type="button"
          className="fv-sidebar-overlay"
          aria-label="Đóng menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id="fv-operator-sidebar"
        className={`fv-sidebar ${menuOpen ? "is-open" : ""}`}
      >
        <div className="fv-sidebar-brand">
          <div className="fv-brand-icon" style={{ backgroundColor: "#16a34a" }}>
            <Leaf size={24} color="#ffffff" />
          </div>

          <span style={{ color: "#16a34a" }}>FreshVend Ops</span>

          <button
            type="button"
            className="fv-sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="fv-sidebar-nav" aria-label="Operator navigation">
          {operatorMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }: { isActive: boolean }) =>
                  `fv-nav-link ${isActive ? "is-active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          className="fv-logout-button"
          onClick={handleLogout}
        >
          <LogOut size={19} />
          <span>Đăng xuất</span>
        </button>
      </aside>

      <div className="fv-main-area">
        <header className="fv-header">
          <div className="fv-header-left">
            <button
              type="button"
              className="fv-menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Mở menu"
              aria-expanded={menuOpen}
              aria-controls="fv-operator-sidebar"
            >
              <Menu size={23} />
            </button>

            <span className="fv-header-title">
              Cổng Vận Hành FreshVend (Operator)
            </span>
          </div>

          <div
            className="fv-user-info"
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            <NotificationBell />
            <span
              className="fv-user-avatar"
              style={{ backgroundColor: "#16a34a" }}
            >
              {user?.username?.charAt(0).toUpperCase() ?? "O"}
            </span>
            <span className="fv-user-name">
              {user?.username ?? "Operator"}
            </span>
            <span
              className="fv-role-badge"
              style={{ backgroundColor: "#dcfce7", color: "#166534" }}
            >
              {user?.role ?? "OPERATOR"}
            </span>
          </div>
        </header>

        <main className="fv-content">
          <Breadcrumb />
          <div className="fv-page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
