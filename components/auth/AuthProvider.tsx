"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  completeOnboarding as completeOnboardingLib,
  getCurrentAccount,
  logIn as logInLib,
  logOut as logOutLib,
  needsOnboarding,
  PublicAccount,
  signUp as signUpLib,
  skipOnboarding as skipOnboardingLib,
  OnboardingInput,
  usesSampleData,
  updateAccountProfile as updateProfileLib,
  AuthResult,
} from "@/lib/auth";

type AuthContextValue = {
  user: PublicAccount | null;
  loading: boolean;
  persistence: "server" | "local" | "unknown";
  refresh: () => Promise<void>;
  signUp: typeof signUpLib;
  logIn: typeof logInLib;
  logOut: () => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<AuthResult>;
  skipOnboarding: () => Promise<AuthResult>;
  updateProfile: (patch: Parameters<typeof updateProfileLib>[0]) => Promise<AuthResult>;
  needsOnboarding: boolean;
  usesSampleData: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readJson(res: Response) {
  return (await res.json().catch(() => ({}))) as {
    configured?: boolean;
    persistence?: "server" | "local";
    account?: PublicAccount | null;
    error?: string;
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [persistence, setPersistence] = useState<"server" | "local" | "unknown">("unknown");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await readJson(res);
      if (data.configured && data.account) {
        setPersistence("server");
        setUser(data.account);
        setLoading(false);
        return;
      }
      if (data.configured) {
        setPersistence("server");
        setUser(null);
        setLoading(false);
        return;
      }
    } catch {
      // Fall through to browser-local demo accounts when the API is unavailable.
    }
    setPersistence("local");
    setUser(getCurrentAccount());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("hl_demo_")) void refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      persistence,
      refresh,
      signUp: async (input) => {
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setPersistence("server");
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (res.status !== 503) {
            return { ok: false, error: data.error || "Sign-up failed." };
          }
        } catch {
          // Local fallback when Postgres is not attached.
        }
        const local = await signUpLib(input);
        if (local.ok) {
          setPersistence("local");
          setUser(local.account);
        }
        return local;
      },
      logIn: async (email, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setPersistence("server");
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (res.status !== 503) {
            return { ok: false, error: data.error || "Log-in failed." };
          }
        } catch {
          // Local fallback when Postgres is not attached.
        }
        const local = await logInLib(email, password);
        if (local.ok) {
          setPersistence("local");
          setUser(local.account);
        }
        return local;
      },
      logOut: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          // Cookie clear is best-effort.
        }
        logOutLib();
        setUser(null);
      },
      completeOnboarding: async (input) => {
        try {
          const res = await fetch("/api/auth/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (res.status !== 503) {
            return { ok: false, error: data.error || "Could not save setup." };
          }
        } catch {
          // Local fallback.
        }
        const local = completeOnboardingLib(input);
        if (local.ok) setUser(local.account);
        return local;
      },
      skipOnboarding: async () => {
        const input: OnboardingInput = {
          gstRegistered: true,
          gstAccountingMethod: "accruals",
          financialYearEnd: "30 June",
          ledgerMode: "sample",
        };
        try {
          const res = await fetch("/api/auth/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (res.status !== 503) {
            return { ok: false, error: data.error || "Could not skip setup." };
          }
        } catch {
          // Local fallback.
        }
        const local = skipOnboardingLib();
        if (local.ok) setUser(local.account);
        return local;
      },
      updateProfile: async (patch) => {
        try {
          const res = await fetch("/api/auth/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (res.status !== 503) {
            return { ok: false, error: data.error || "Could not save profile." };
          }
        } catch {
          // Local fallback.
        }
        const local = updateProfileLib(patch);
        if (local.ok) setUser(local.account);
        return local;
      },
      needsOnboarding: needsOnboarding(user),
      usesSampleData: usesSampleData(user),
    }),
    [user, loading, persistence, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
