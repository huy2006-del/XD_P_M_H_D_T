
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Leaf, PackagePlus, Boxes, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "../features/auth/authStore";
import Breadcrumb from "../shared/components/Breadcrumb";
import "./managementLayout.css";

export default function OperatorLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.userProfile);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
      }}
    >
      <header
        style={{
          padding: "20px 28px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#16a34a",
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          <Leaf size={26} />
          FreshVend Operator
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>{user?.username}</span>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              cursor: "pointer",
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <nav aria-label="Điều hướng Operator" className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-2 md:px-7">
        {[
          { href: "/operator/dashboard", label: "Tổng quan", Icon: LayoutDashboard },
          { href: "/operator/restock", label: "Nạp hàng", Icon: PackagePlus },
          { href: "/operator/batches", label: "Lô hàng", Icon: Boxes },
        ].map(({ href, label, Icon }) => {
          const active = location.pathname === href;
          return <button key={href} type="button" onClick={() => navigate(href)} aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}>
            <Icon size={16} /> {label}
          </button>;
        })}
      </nav>

      <main style={{ padding: 24, minWidth: 0 }}>
        <Breadcrumb />
        <Outlet />
      </main>
    </div>
  );
}
