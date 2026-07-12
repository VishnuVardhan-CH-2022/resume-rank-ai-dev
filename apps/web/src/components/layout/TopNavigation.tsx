import { getSupabasePublicConfig } from "@/lib/supabase";

export function TopNavigation() {
  const { configured } = getSupabasePublicConfig();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <p className="text-sm text-muted-foreground">Authenticated HR workspace</p>
      <div className="text-sm text-muted-foreground">
        {configured ? "Supabase: connected env" : "Supabase: env pending"}
      </div>
    </header>
  );
}
