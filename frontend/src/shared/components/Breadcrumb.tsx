
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const pageNames: Record<string, string> = {
  admin: "Admin",
  operator: "Operator",
  dashboard: "Dashboard",
  products: "Products",
  machines: "Machines",
};

export default function Breadcrumb() {
  const location = useLocation();

  const segments = location.pathname
    .split("/")
    .filter(Boolean);

  const homePath = segments[0] === "operator"
    ? "/operator/dashboard"
    : "/admin/dashboard";

  return (
    <nav
      aria-label="Breadcrumb"
      className="fv-breadcrumb"
    >
      <Link to={homePath} aria-label="Dashboard">
        <Home size={16} />
      </Link>

      {segments.map((segment, index) => {
        const path =
          "/" + segments.slice(0, index + 1).join("/");

        const isLast = index === segments.length - 1;

        return (
          <span className="fv-breadcrumb-item" key={path}>
            <ChevronRight size={15} />

            {isLast ? (
              <span
                className="fv-breadcrumb-current"
                aria-current="page"
              >
                {pageNames[segment] ?? segment}
              </span>
            ) : (
              <Link to={path}>
                {pageNames[segment] ?? segment}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
