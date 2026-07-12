import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/modules/auth/components/AuthCard";
import {
  authErrorMessage,
  useAuth,
} from "@/modules/auth/context/AuthProvider";
import {
  AUTH_PASSWORD_MIN_LENGTH,
  validateEmail,
  validatePasswordConfirm,
  validatePasswordPolicy,
} from "@/modules/auth/lib/validation";

/** UXD §6.2 / §8.1a Signup */
export function SignupPage() {
  const { signUp, configured } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [holdingMessage, setHoldingMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setHoldingMessage(null);

    const emailErr = validateEmail(email);
    const passwordErr = validatePasswordPolicy(password);
    const confirmErr = validatePasswordConfirm(password, confirm);
    setFieldErrors({
      email: emailErr ?? undefined,
      password: passwordErr ?? undefined,
      confirm: confirmErr ?? undefined,
    });
    if (emailErr || passwordErr || confirmErr) return;

    setSubmitting(true);
    const result = await signUp(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(authErrorMessage(result.error));
      return;
    }

    if (result.data.needsConfirm) {
      setHoldingMessage(
        "Account created. Check your email to confirm before signing in.",
      );
      return;
    }

    navigate("/dashboard", { replace: true });
  }

  return (
    <AuthCard
      title="Create account"
      description="Register to manage jobs and screen resumes."
    >
      {!configured ? (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>
            Supabase env is missing. Add{" "}
            <code className="text-xs">VITE_SUPABASE_URL</code> and{" "}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to{" "}
            <code className="text-xs">apps/web/.env</code>.
          </AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {holdingMessage ? (
        <Alert className="mb-4">
          <AlertDescription>{holdingMessage}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={submitting || !configured}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="text-sm text-destructive">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            disabled={submitting || !configured}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <p className="text-xs text-muted-foreground">
            At least {AUTH_PASSWORD_MIN_LENGTH} characters, with letters and
            digits.
          </p>
          {fieldErrors.password ? (
            <p className="text-sm text-destructive">{fieldErrors.password}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            disabled={submitting || !configured}
            aria-invalid={Boolean(fieldErrors.confirm)}
          />
          {fieldErrors.confirm ? (
            <p className="text-sm text-destructive">{fieldErrors.confirm}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !configured}
        >
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
