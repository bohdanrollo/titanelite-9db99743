const TIER_RANK: Record<string, number> = { basic: 0, limited: 1, full: 2, elite: 3 };
const TIER_BY_PLAN: Record<string, string> = {
  basic_monthly: "basic",
  limited_monthly: "limited",
  full_monthly: "full",
  elite_monthly: "elite",
};

export function isCheckoutActivated(tier: string | null, plan?: string): boolean {
  const currentRank = tier ? TIER_RANK[tier] : undefined;
  if (currentRank === undefined) return false;
  const purchasedTier = plan ? TIER_BY_PLAN[plan] : undefined;
  const requiredRank = purchasedTier ? TIER_RANK[purchasedTier] : 1;
  return requiredRank !== undefined && currentRank >= requiredRank;
}