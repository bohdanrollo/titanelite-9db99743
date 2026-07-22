import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AccessTier = "limited" | "full" | null;

export const LIMITED_TABS = [
  "peptides",
  "articles",
  "lifting",
  "supplies",
  "reconstitution",
  "injection",
] as const;

export const FULL_ONLY_TABS = ["protocols", "mystack", "calculator", "peptalk"] as const;

export function isTabAllowed(tab: string, tier: AccessTier, isAdmin: boolean): boolean {
  if (isAdmin || tier === "full") return true;
  if (tier === "limited") return (LIMITED_TABS as readonly string[]).includes(tab);
  return false;
}

export function useAccess() {
  const { user, role } = useAuth();
  const [tier, setTier] = useState<AccessTier>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("user_access")
      .select("tier")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTier((data?.tier as AccessTier) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { tier, loading, isAdmin: role === "admin" };
}
