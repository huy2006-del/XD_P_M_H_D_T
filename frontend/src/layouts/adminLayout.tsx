
import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Apple,
  LayoutDashboard,
  Package,
  Monitor,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import Breadcrumb from "../shared/components/Breadcrumb";
import { useAuthStore } from "../features/auth/authStore";
import "./managementLayout.css";

const menuItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Products",
    path: "/admin/products",
    icon: Package,
  },
  {
    label: "Machines",
    path: "/admin/machines",
    icon: Monitor,
  },
];

export default function AdminLayout() {
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
        id="fv-admin-sidebar"
        className={`fv-sidebar ${menuOpen ? "is-open" : ""}`}
      >
        <div className="fv-sidebar-brand">
          <div className="fv-brand-icon">
            <Apple size={24} />
          </div>

          <span>FreshVend</span>

          <button
            type="button"
            className="fv-sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="fv-sidebar-nav" aria-label="Admin navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
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
          <span>Logout</span>
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
              aria-controls="fv-admin-sidebar"
            >
              <Menu size={23} />
            </button>

            <span className="fv-header-title">
              FreshVend Management
            </span>
          </div>

          <div className="fv-user-info">
            <span className="fv-user-avatar">
              {user?.username?.charAt(0).toUpperCase() ?? "A"}
            </span>

            <span className="fv-user-name">
              {user?.username ?? "Admin"}
            </span>

            <span className="fv-role-badge">
              {user?.role ?? "ADMIN"}
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
