/**
 * Client password policy mirrors supabase/config.toml (SEC SA-05 / DEP §7.2).
 * Hosted projects must use the same Auth settings.
 */
export const AUTH_PASSWORD_MIN_LENGTH = 8;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Enter a valid email";
  // Practical email shape check (UXD §8.1)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email";
  }
  return null;
}

export function validatePasswordRequired(password: string): string | null {
  if (!password) return "Password is required";
  return null;
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include letters and digits";
  }
  return null;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string,
): string | null {
  if (password !== confirm) return "Passwords do not match";
  return null;
}
