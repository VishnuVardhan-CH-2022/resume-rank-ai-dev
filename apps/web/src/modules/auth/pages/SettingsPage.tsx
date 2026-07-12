import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  authErrorMessage,
  useAuth,
} from "@/modules/auth/context/AuthProvider";

/** UXD §6 Settings — sign out + session info (minimal) */
export function SettingsPage() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    const confirmed = window.confirm("Sign out of ResumeRank AI?");
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    const result = await signOut();
    setBusy(false);

    if (!result.ok) {
      setError(authErrorMessage(result.error));
      return;
    }

    navigate("/login", { replace: true });
  }

  const expiresAt = session?.expires_at
    ? new Date(session.expires_at * 1000).toLocaleString()
    : "—";

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Session and account controls."
      />

      {error ? (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <dl className="mb-6 space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Signed in as</dt>
          <dd className="font-medium">{user?.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Access token expires</dt>
          <dd className="font-medium">{expiresAt}</dd>
        </div>
      </dl>

      <Button
        variant="destructive"
        onClick={() => void onSignOut()}
        disabled={busy}
      >
        {busy ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
