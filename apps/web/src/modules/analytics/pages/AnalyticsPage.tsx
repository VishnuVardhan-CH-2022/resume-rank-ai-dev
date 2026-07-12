import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsDashboard } from "@/modules/analytics/components/AnalyticsDashboard";

export function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Owner-scoped job progress, distributions, and screening metrics."
      />
      <AnalyticsDashboard />
    </div>
  );
}
