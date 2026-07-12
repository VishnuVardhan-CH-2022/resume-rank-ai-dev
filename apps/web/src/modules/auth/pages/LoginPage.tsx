import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md border border-border bg-card p-8 shadow-sm">
        <PageHeader
          title="ResumeRank AI"
          description="Sign in to continue. Auth wiring lands in Phase 4."
        />
        <p className="text-sm text-muted-foreground">
          Placeholder login screen for Phase 1 project setup.
        </p>
        <Button className="mt-6" render={<Link to="/jobs" />}>
          Continue to app shell
        </Button>
      </div>
    </div>
  );
}
