// Page frame for every page. Signed-out users are sent to /login.

import { Navigate, Outlet, useLocation } from "react-router";
import { Sidebar } from "@/components/Sidebar";
import { Loading } from "@/components/States";
import { useAuth } from "@/lib/auth";

export function Layout() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (pathname === "/login") return <Outlet />;
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen md:pl-60">
      <Sidebar />
      <main className="mx-auto max-w-6xl p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
