import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { getSupabasePublicConfig } from "@/lib/supabase";

export function LoginPage() {
  const { configured, url } = getSupabasePublicConfig();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md border border-border bg-card p-8 shadow-sm">
        <PageHeader
          title="ResumeRank AI"
          description="Sign in to continue. Auth forms land in Phase 4."
        />
        <p className="text-sm text-muted-foreground">
          Phase 2: browser Supabase client is ready. Add{" "}
          <code className="text-xs">VITE_SUPABASE_*</code> in{" "}
          <code className="text-xs">apps/web/.env</code> (see{" "}
          <code className="text-xs">.env.example</code>).
        </p>
        <p
          className={[
            "mt-4 rounded-md border px-3 py-2 text-sm",
            configured
              ? "border-primary/30 bg-accent text-accent-foreground"
              : "border-border bg-muted text-muted-foreground",
          ].join(" ")}
          role="status"
        >
          {configured
            ? `Supabase configured (${url})`
            : "Supabase not configured — env keys missing"}
        </p>
        <Button className="mt-6" render={<Link to="/jobs" />}>
          Continue to app shell
        </Button>
      </div>
    </div>
  );
}
