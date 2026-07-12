/**
 * 401 recovery for polls/commands — UXD §5.4.6 / §14.6 / CP-10.
 * Attempt one refresh; on failure clear session and send user to login.
 */
import { refreshSessionOnce, signOut } from "@/modules/auth/lib/auth-api";

export async function recoverFromUnauthorized(
  returnPath: string,
): Promise<"refreshed" | "redirect"> {
  const ok = await refreshSessionOnce();
  if (ok) return "refreshed";

  await signOut();
  const next =
    returnPath.startsWith("/") && !returnPath.startsWith("//")
      ? returnPath
      : "/dashboard";
  window.location.assign(
    `/login?next=${encodeURIComponent(next)}`,
  );
  return "redirect";
}
