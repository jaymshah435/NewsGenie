// Navigation, the signed-in user and the logout button.

import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Content Analytics" },
  { href: "/moderation", label: "Community Moderation" },
  { href: "/protection", label: "Content Protection" },
  { href: "/assistant", label: "AI Assistant" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="flex w-full flex-col bg-slate-900 text-slate-300 md:fixed md:inset-y-0 md:left-0 md:w-60">
      <div className="px-5 py-5 text-xl font-bold text-white">NewsGenie</div>
      <nav className="flex flex-wrap gap-1 px-3 md:flex-col">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={`rounded-md px-3 py-2 text-sm ${
              pathname === link.href ? "bg-slate-700 font-medium text-white" : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {user && (
        <div className="mt-auto border-t border-slate-700 p-5 text-sm">
          <p className="font-medium text-white">{user.name}</p>
          <p className="text-xs">{user.email}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {user.organizations.map((o) => (
              <li key={o.id}>
                {o.name}: <span className="text-white">{o.role === "admin" ? "Admin" : "Standard user"}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-4 w-full rounded-md border border-slate-600 py-1.5 hover:bg-slate-800 hover:text-white"
          >
            Log out
          </button>
        </div>
      )}
    </aside>
  );
}
