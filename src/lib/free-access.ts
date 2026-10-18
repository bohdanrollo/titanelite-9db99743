export function accountAccessTier(storedTier: "basic" | "limited" | "full" | "elite" | null, hasAccount: boolean) {
  return hasAccount ? storedTier ?? "basic" : null;
}
export function isPaidCheckoutPrice(priceId: string) {
  return priceId !== "basic_monthly";
}