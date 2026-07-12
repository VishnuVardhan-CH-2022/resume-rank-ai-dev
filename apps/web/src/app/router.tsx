import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { JobsListPage } from "@/modules/jobs/pages/JobsListPage";
import { JobCreatePage } from "@/modules/jobs/pages/JobCreatePage";
import { JobDetailPage } from "@/modules/jobs/pages/JobDetailPage";
import { CandidateDetailPage } from "@/modules/candidates/pages/CandidateDetailPage";
import { AnalyticsPage } from "@/modules/analytics/pages/AnalyticsPage";
import { NotFoundPage } from "@/modules/auth/pages/NotFoundPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/jobs" replace />} />
        <Route path="/jobs" element={<JobsListPage />} />
        <Route path="/jobs/new" element={<JobCreatePage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route
          path="/jobs/:jobId/candidates/:candidateId"
          element={<CandidateDetailPage />}
        />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
