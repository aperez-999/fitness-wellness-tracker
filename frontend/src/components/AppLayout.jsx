import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";
import Brand from "./Brand.jsx";
import "./app-layout.css";

// Desktop and mobile navigation share the same routes and active state.
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/workouts", label: "Workouts", icon: "workout" },
  { to: "/nutrition", label: "Nutrition", icon: "nutrition" },
  { to: "/goals", label: "Goals", icon: "goals" },
  { to: "/profile", label: "Profile", icon: "profile" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayLabel =
    user?.displayName || user?.email?.split("@")[0] || "Account";

  const initials = displayLabel
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dayform-theme wellness-app">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="app-sidebar">
        <Brand />

        <nav className="app-navigation" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `app-nav-link${isActive ? " is-active" : ""}`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-account">
          <span className="account-avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="account-details">
            <strong title={displayLabel}>{displayLabel}</strong>
            <span className="account-email" title={user?.email}>
              {user?.email}
            </span>
          </div>
          <div className="account-actions">
            <NavLink className="text-link" to="/profile">
              View profile
            </NavLink>
            <button
              onClick={handleLogout}
              className="logout-button"
              aria-label="Log out"
              title="Log out"
            >
              <Icon name="logout" size={17} />
              <span className="logout-label">Log out</span>
            </button>
          </div>
        </div>
      </aside>
      {/* Routed pages share this shell; the skip link targets their content. */}
      <main id="main-content" className="app-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
