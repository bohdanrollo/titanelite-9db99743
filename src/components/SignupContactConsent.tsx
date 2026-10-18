import { MARKETING_CONSENT_TEXT } from "@/lib/signup-schema";

export function SignupContactConsent({ phone, onPhone, consent, onConsent, idPrefix }: {
  phone: string; onPhone: (value: string) => void; consent: boolean;
  onConsent: (value: boolean) => void; idPrefix: string;
}) {
  return <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-phone`} className="mb-2 block text-xs text-muted-foreground">Phone number (including country code) *</label>
      <input id={`${idPrefix}-phone`} type="tel" autoComplete="tel" required maxLength={30}
        value={phone} onChange={(event) => onPhone(event.target.value)} placeholder="+1 317 555 0123"
        className="w-full border border-foreground/20 bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none" />
    </div>
    <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground">
      <input type="checkbox" required checked={consent} onChange={(event) => onConsent(event.target.checked)} className="mt-0.5 accent-primary" />
      <span>{MARKETING_CONSENT_TEXT}</span>
    </label>
  </div>;
}