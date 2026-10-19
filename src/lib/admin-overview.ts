export type OverviewTier = "basic" | "limited" | "full" | "elite";

/** List monthly price per tier, before discounts. */
export function tierMonthlyPrice(tier: OverviewTier): number {
  return { basic: 2.99, limited: 10.99, full: 40.99, elite: 250 }[tier];
}

export const tierLabel: Record<OverviewTier, string> = {
  basic: "Basic",
  limited: "Limited",
  full: "Full (legacy)",
  elite: "Elite",
};
