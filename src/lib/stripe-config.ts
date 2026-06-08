// Public Stripe price reference. Safe for client bundle.
export type TierId = "Foundation" | "Elite" | "Apex";

export const STRIPE_PRICES: Record<TierId, { priceId: string; mode: "payment" | "subscription"; amountCents: number; label: string }> = {
  Foundation: { priceId: "price_1TfseG37DvKvYJGFC6o8M5Ux", mode: "payment", amountCents: 5900, label: "Foundation — $59 one-time" },
  Elite: { priceId: "price_1TfseG37DvKvYJGFTx5SXMcL", mode: "subscription", amountCents: 19900, label: "Elite — $199 / month" },
  Apex: { priceId: "price_1TfseG37DvKvYJGFdxUFYJlx", mode: "subscription", amountCents: 39900, label: "Apex — $399 / month" },
};

export const TIER_IDS: TierId[] = ["Foundation", "Elite", "Apex"];
