import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/modules/auth/context/AuthProvider";

/**
 * Dashboard shell — UXD §6.3 / CP-09 redirect target.
 * Metrics wiring lands in Analytics phase; auth gate only here.
 */
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome${user?.email ? `, ${user.email}` : ""}. Cross-job metrics arrive in a later phase.`}
        actions={
          <Button render={<Link to="/jobs/new" />}>Create job</Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        Use <Link className="text-primary underline" to="/jobs">Jobs</Link> to
        manage openings, or{" "}
        <Link className="text-primary underline" to="/settings">
          Settings
        </Link>{" "}
        to sign out.
      </p>
    </div>
  );
}
