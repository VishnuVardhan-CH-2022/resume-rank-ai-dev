import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <PageHeader title="Page not found" description="That route is not defined." />
      <Button render={<Link to="/jobs" />}>Back to jobs</Button>
    </div>
  );
}
