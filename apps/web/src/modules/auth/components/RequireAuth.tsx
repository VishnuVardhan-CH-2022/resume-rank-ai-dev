import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/modules/auth/context/AuthProvider";

/** Protect AppShell routes — UXD §5 / CP-10 / AC-G01 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (!session) {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate to="/login" replace state={{ next }} />
    );
  }

  return children;
}
