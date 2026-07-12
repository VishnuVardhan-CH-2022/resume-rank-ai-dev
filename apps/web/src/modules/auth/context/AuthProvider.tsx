import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  refreshSessionOnce,
  signInWithPassword,
  signOut as apiSignOut,
  signUpWithPassword,
  type AuthResult,
} from "@/modules/auth/lib/auth-api";
import type { ErrorObject } from "@/lib/errors";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<AuthResult<{ session: Session; user: User }>>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<
    AuthResult<{
      session: Session | null;
      user: User | null;
      needsConfirm: boolean;
    }>
  >;
  signOut: () => Promise<AuthResult<null>>;
  /** One-shot refresh for 401 recovery (CP-10). */
  refreshSessionOnce: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInWithPassword(email, password);
    if (result.ok) setSession(result.data.session);
    return result;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await signUpWithPassword(email, password);
    if (result.ok && result.data.session) {
      setSession(result.data.session);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    const result = await apiSignOut();
    setSession(null);
    return result;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured,
      signIn,
      signUp,
      signOut,
      refreshSessionOnce,
    }),
    [session, loading, configured, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/** Safe message helper for forms */
export function authErrorMessage(error: ErrorObject): string {
  return error.error.message;
}
