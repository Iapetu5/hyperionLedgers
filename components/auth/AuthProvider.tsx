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
} from "@/lib/auth";

type AuthContextValue = {
  user: PublicAccount | null;
  loading: boolean;
  refresh: () => void;
  signUp: typeof signUpLib;
  logIn: typeof logInLib;
  logOut: () => void;
  completeOnboarding: (input: OnboardingInput) => ReturnType<typeof completeOnboardingLib>;
  skipOnboarding: () => ReturnType<typeof skipOnboardingLib>;
  updateProfile: typeof updateProfileLib;
  needsOnboarding: boolean;
  usesSampleData: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setUser(getCurrentAccount());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("hl_demo_")) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      signUp: async (input) => {
        const res = await signUpLib(input);
        if (res.ok) setUser(res.account);
        return res;
      },
      logIn: async (email, password) => {
        const res = await logInLib(email, password);
        if (res.ok) setUser(res.account);
        return res;
      },
      logOut: () => {
        logOutLib();
        setUser(null);
      },
      completeOnboarding: (input) => {
        const res = completeOnboardingLib(input);
        if (res.ok) setUser(res.account);
        return res;
      },
      skipOnboarding: () => {
        const res = skipOnboardingLib();
        if (res.ok) setUser(res.account);
        return res;
      },
      updateProfile: (patch) => {
        const res = updateProfileLib(patch);
        if (res.ok) setUser(res.account);
        return res;
      },
      needsOnboarding: needsOnboarding(user),
      usesSampleData: usesSampleData(user),
    }),
    [user, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
