export type PaymentEnvironment = "sandbox" | "live";

export function paymentEnvironmentForKey(key: string | undefined): PaymentEnvironment {
  if (key?.startsWith("pk_live_")) return "live";
  if (key?.startsWith("pk_test_")) return "sandbox";
  throw new Error("Payments are not configured for this build.");
}

/** Trusted build configuration, never a caller-selected environment. */
export function configuredPaymentEnvironment(): PaymentEnvironment {
  return paymentEnvironmentForKey(import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN);
}

export function validatePaymentEnvironment(requested: string, configured: PaymentEnvironment): void {
  if (requested !== configured) throw new Error("Payment environment does not match this site.");
}