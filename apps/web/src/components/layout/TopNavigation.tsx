import { Link } from "react-router-dom";
import { useAuth } from "@/modules/auth/context/AuthProvider";

export function TopNavigation() {
  const { user, configured } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <p className="text-sm text-muted-foreground">Authenticated HR workspace</p>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {!configured ? (
          <span>Supabase: env pending</span>
        ) : (
          <span className="truncate max-w-[220px]">{user?.email}</span>
        )}
        <Link
          to="/settings"
          className="text-primary underline-offset-4 hover:underline"
        >
          Settings
        </Link>
      </div>
    </header>
  );
}
