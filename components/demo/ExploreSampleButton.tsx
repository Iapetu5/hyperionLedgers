"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

/** Log out (if needed) and open the Harbour & Co guest sample demo. */
export function useExploreHarbourSample() {
  const { user, logOut } = useAuth();
  const router = useRouter();
  return async () => {
    if (user) await logOut();
    router.push("/demo");
  };
}

export function ExploreSampleButton({
  primary = true,
  label = "Explore Harbour & Co sample",
  className = "",
}: {
  primary?: boolean;
  label?: string;
  className?: string;
}) {
  const explore = useExploreHarbourSample();
  return (
    <button
      type="button"
      className={`${primary ? "btn-primary" : "btn-secondary"} ${className}`.trim()}
      onClick={explore}
    >
      <Sparkles size={16} />
      {label}
    </button>
  );
}
