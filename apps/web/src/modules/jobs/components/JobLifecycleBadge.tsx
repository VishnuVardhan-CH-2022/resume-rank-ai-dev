import { Badge } from "@/components/ui/badge";
import type { JobLifecycleStatus } from "@/modules/jobs/types";

export function JobLifecycleBadge({
  status,
}: {
  status: JobLifecycleStatus;
}) {
  if (status === "archived") {
    return <Badge variant="secondary">Archived</Badge>;
  }
  return <Badge>Active</Badge>;
}
