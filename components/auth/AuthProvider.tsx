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
import { setBooksPersistence } from "@/lib/books-client";

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

  const applyMe = useCallback((data: Awaited<ReturnType<typeof readJson>>) => {
    if (data.configured === true) {
      const hasAccount = Boolean(data.account);
      setPersistence("server");
      setBooksPersistence("server", { hasAccount });
      setUser(data.account ?? null);
      return true;
    }
    if (data.configured === false || data.persistence === "local") {
      setPersistence("local");
      setBooksPersistence("local", { hasAccount: Boolean(getCurrentAccount()) });
      setUser(getCurrentAccount());
      return true;
    }
    return false;
  }, []);

  const refresh = useCallback(async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const data = await readJson(res);
        if (applyMe(data)) {
          setLoading(false);
          return;
        }
      } catch {
        /* retry */
      }
    }
    // Ambiguous (rate-limit HTML, network): do not invent a localStorage session.
    setLoading(false);
  }, [applyMe]);

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
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setPersistence("server");
            setBooksPersistence("server", { hasAccount: true });
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (!(res.status === 503 && data.configured === false)) {
            return { ok: false, error: data.error || "Sign-up failed." };
          }
        } catch {
          return { ok: false, error: "Could not reach HyperionInvoices. Try again." };
        }
        const local = await signUpLib(input);
        if (local.ok) {
          setPersistence("local");
          setBooksPersistence("local", { hasAccount: true });
          setUser(local.account);
        }
        return local;
      },
      logIn: async (email, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setPersistence("server");
            setBooksPersistence("server", { hasAccount: true });
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (!(res.status === 503 && data.configured === false)) {
            return { ok: false, error: data.error || "Log-in failed." };
          }
        } catch {
          return { ok: false, error: "Could not reach HyperionInvoices. Try again." };
        }
        const local = await logInLib(email, password);
        if (local.ok) {
          setPersistence("local");
          setBooksPersistence("local", { hasAccount: true });
          setUser(local.account);
        }
        return local;
      },
      logOut: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {
          // Cookie clear is best-effort.
        }
        logOutLib();
        const keepServer = persistence !== "local";
        setBooksPersistence(keepServer ? "server" : "local", { hasAccount: false });
        setPersistence(keepServer ? "server" : "local");
        setUser(null);
      },
      completeOnboarding: async (input) => {
        try {
          const res = await fetch("/api/auth/onboarding", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setPersistence("server");
            setBooksPersistence("server", { hasAccount: true });
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (!(res.status === 503 && data.configured === false)) {
            return { ok: false, error: data.error || "Could not save setup." };
          }
        } catch {
          return { ok: false, error: "Could not reach HyperionInvoices. Try again." };
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
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setPersistence("server");
            setBooksPersistence("server", { hasAccount: true });
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (!(res.status === 503 && data.configured === false)) {
            return { ok: false, error: data.error || "Could not skip setup." };
          }
        } catch {
          return { ok: false, error: "Could not reach HyperionInvoices. Try again." };
        }
        const local = skipOnboardingLib();
        if (local.ok) setUser(local.account);
        return local;
      },
      updateProfile: async (patch) => {
        try {
          const res = await fetch("/api/auth/profile", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const data = await readJson(res);
          if (res.ok && data.account) {
            setPersistence("server");
            setBooksPersistence("server", { hasAccount: true });
            setUser(data.account);
            return { ok: true, account: data.account };
          }
          if (!(res.status === 503 && data.configured === false)) {
            return { ok: false, error: data.error || "Could not save profile." };
          }
        } catch {
          return { ok: false, error: "Could not reach HyperionInvoices. Try again." };
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
