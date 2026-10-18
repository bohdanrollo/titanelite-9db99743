import { z } from "zod";

export const MARKETING_CONSENT_VERSION = "peplog-offers-2026-10-18";
export const MARKETING_CONSENT_TEXT = "By creating an account, I agree to receive email and SMS messages about PepLog deals and offers, including PepHub offers. Message frequency varies. Message and data rates may apply. Unsubscribe from emails at any time or reply STOP to texts.";

export const phoneSchema = z.string().trim().max(30)
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number with country code, such as +1 317 555 0123."));

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  phone: phoneSchema,
  marketingConsent: z.literal(true, { message: "Please agree to email and SMS offers to create your account." }),
  age21: z.literal(true),
  researchUse: z.literal(true),
});

export function signupMetadata(data: z.infer<typeof signupSchema>) {
  return { full_name: data.name, phone: data.phone, marketing_consent: true,
    marketing_consent_version: MARKETING_CONSENT_VERSION, age_21_confirmed: true, research_use_confirmed: true };
}