import { z } from "zod";

const s = (max = 400) => z.string().max(max);
const color = z.string().max(40).refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "Colors must look like #1a2b3c");
const image = z.string().max(500).refine((v) => v === "" || /^(https:\/\/|\/)/.test(v), "Image links must start with https:// or /");

export const homepageSchema = z.object({
  colors: z.object({ accent: color, background: color, text: color }),
  hero: z.object({ line1: s(120), line2: s(120), sub: s(), note: s(200), image }),
  stats: z.array(z.object({ value: s(20), label: s(60) })).length(3),
  giveaway: z.object({ show: z.boolean(), kicker: s(120), title: s(120), body: s(), rules: z.array(s(300)).length(3) }),
  platform: z.object({ title1: s(80), title2: s(80), body: s() }),
  method: z.object({ kicker: s(80), title1: s(80), title2: s(80), body: s() }),
  closing: z.object({ kicker: s(80), title1: s(80), title2: s(80), body: s(), image }),
  pricing: z.object({ title: s(120), sub: s(), note: s(300) }),
});
export type HomepageContent = z.infer<typeof homepageSchema>;

export const DEFAULT_HOMEPAGE: HomepageContent = {
  colors: { accent: "", background: "", text: "" },
  hero: {
    line1: "Track the protocol.", line2: "Read the signals.",
    sub: "PepLog brings peptide research, custom protocols, training, nutrition, labs, and coaching into one precise performance record.",
    note: "Basic Access is free with an account · AI and coaching available on paid plans", image: "",
  },
  stats: [{ value: "21", label: "Connected tools" }, { value: "60+", label: "Research profiles" }, { value: "1", label: "Private performance log" }],
  giveaway: {
    show: true, kicker: "THE PEPLOG.IO GIVEAWAY- ENDING SOON!", title: "Win a Rolex GMT-Master.",
    body: "A stainless steel GMT-Master with the blue and black Batman bezel.",
    rules: ["Be paying for a PepLog plan.", "Be signed up to receive both emails and texts from PepHub.", "Invite friends for extra entries. Extra entries count only after your invited friend enters the giveaway."],
  },
  platform: { title1: "Every signal.", title2: "One record.", body: "The tools you use every day stay connected to the same plan, giving you a clearer view of what you are doing and what is changing." },
  method: { kicker: "Built around you", title1: "Data informs.", title2: "Coaching decides.", body: "PepLog brings your goals, training history, body composition, health context, and research interests into a clear plan—not a generic download." },
  closing: { kicker: "Keep a better record", title1: "Less guesswork.", title2: "More signal.", body: "Join PepLog for private dashboard access, connected performance tools, and a plan built around your goals.", image: "" },
  pricing: { title: "Start free. Go further.", sub: "Free tracking and research. Add AI insights or personal coaching when you need them. Every plan comes with a personal peptide discount code!", note: "Prices in USD. Paid plans billed monthly; cancel anytime. Find an affiliate code for a discount!" },
};

/** Merge stored (possibly partial/old) content over defaults, falling back to defaults if invalid. */
export function mergeHomepage(stored: unknown): HomepageContent {
  const v = (stored && typeof stored === "object" ? stored : {}) as Record<string, any>;
  const out: any = structuredClone(DEFAULT_HOMEPAGE);
  for (const k of Object.keys(out)) {
    if (v[k] === undefined) continue;
    out[k] = Array.isArray(out[k]) ? v[k] : { ...out[k], ...v[k] };
  }
  const r = homepageSchema.safeParse(out);
  return r.success ? r.data : structuredClone(DEFAULT_HOMEPAGE);
}
