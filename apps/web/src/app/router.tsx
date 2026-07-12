import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/modules/auth/components/RequireAuth";
import { PublicOnly } from "@/modules/auth/components/PublicOnly";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { SignupPage } from "@/modules/auth/pages/SignupPage";
import { DashboardPage } from "@/modules/auth/pages/DashboardPage";
import { SettingsPage } from "@/modules/auth/pages/SettingsPage";
import { NotFoundPage } from "@/modules/auth/pages/NotFoundPage";
import { JobsListPage } from "@/modules/jobs/pages/JobsListPage";
import { JobCreatePage } from "@/modules/jobs/pages/JobCreatePage";
import { JobEditPage } from "@/modules/jobs/pages/JobEditPage";
import { JobDetailPage } from "@/modules/jobs/pages/JobDetailPage";
import { CandidateDetailPage } from "@/modules/candidates/pages/CandidateDetailPage";
import { AnalyticsPage } from "@/modules/analytics/pages/AnalyticsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <SignupPage />
          </PublicOnly>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/jobs" element={<JobsListPage />} />
        <Route path="/jobs/new" element={<JobCreatePage />} />
        <Route path="/jobs/:jobId/edit" element={<JobEditPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route
          path="/jobs/:jobId/candidates/:candidateId"
          element={<CandidateDetailPage />}
        />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
