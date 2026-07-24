import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStripeEnvironment } from "@/lib/stripe";

export type AccessTier = "limited" | "full" | null;

export const LIMITED_TABS = [
  "peptides",
  "combos",
  "learning",
  "myths",
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

function currentEnv(): "sandbox" | "live" | null {
  try {
    return getStripeEnvironment();
  } catch {
    return null;
  }
}

export function useAccess() {
  const { user, role } = useAuth();
  const [tier, setTier] = useState<AccessTier>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setTier(null);
      setLoading(false);
      return;
    }
    const env = currentEnv();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = (supabase as any).from("user_access").select("tier").eq("user_id", user.id);
    if (env) q = q.eq("environment", env);
    q = q.order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data } = await q;
    setTier((data?.tier as AccessTier) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    load().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  return { tier, loading, isAdmin: role === "admin", refresh: load };
}
