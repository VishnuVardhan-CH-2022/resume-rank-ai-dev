import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export function JobsListPage() {
  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Job list will load from Supabase in later phases."
        actions={
          <Button render={<Link to="/jobs/new" />}>Create job</Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        Phase 1 scaffold — no API calls yet.
      </p>
    </div>
  );
}
