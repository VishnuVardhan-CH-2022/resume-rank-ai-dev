import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/modules/auth/context/AuthProvider";

function resolveNext(state: unknown, search: string): string {
  const fromState =
    state && typeof state === "object" && "next" in state
      ? String((state as { next?: string }).next ?? "")
      : "";
  const fromQuery = new URLSearchParams(search).get("next") ?? "";
  const candidate = fromState || fromQuery || "/dashboard";
  // Prevent open redirects
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }
  return candidate;
}

/** Logged-in users leave login/signup — CP-09 */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (session) {
    return (
      <Navigate
        to={resolveNext(location.state, location.search)}
        replace
      />
    );
  }

  return children;
}
