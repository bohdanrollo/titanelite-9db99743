/** Canonical compound dictionary used to normalize vendor product names. */
export type CompoundDef = { name: string; category: string; aliases: string[] };

// Blends first so the longest/most specific match wins.
export const COMPOUNDS: CompoundDef[] = [
  { name: "BPC-157 / TB-500", category: "Blend", aliases: ["bpc157tb500", "bpctb", "wolverine", "bpc157tb4", "tb500bpc157"] },
  { name: "CJC-1295 / Ipamorelin", category: "Blend", aliases: ["cjc1295ipamorelin", "cjcipa", "cjcipamorelin", "ipamorelincjc1295", "cjcnodacipamorelin"] },
  { name: "GLOW", category: "Blend", aliases: ["glow"] },
  { name: "KLOW", category: "Blend", aliases: ["klow"] },
  { name: "BPC-157", category: "Healing", aliases: ["bpc157", "bpc"] },
  { name: "TB-500", category: "Healing", aliases: ["tb500", "thymosinbeta4", "tb4"] },
  { name: "GHK-Cu", category: "Skin", aliases: ["ghkcu", "ghkcopper", "copperpeptide"] },
  { name: "KPV", category: "Healing", aliases: ["kpv"] },
  { name: "Ipamorelin", category: "Growth hormone", aliases: ["ipamorelin"] },
  { name: "CJC-1295 (no DAC)", category: "Growth hormone", aliases: ["cjc1295nodac", "moddgrf129", "modgrf129"] },
  { name: "CJC-1295 (DAC)", category: "Growth hormone", aliases: ["cjc1295dac", "cjc1295withdac"] },
  { name: "Tesamorelin", category: "Growth hormone", aliases: ["tesamorelin"] },
  { name: "Sermorelin", category: "Growth hormone", aliases: ["sermorelin"] },
  { name: "Hexarelin", category: "Growth hormone", aliases: ["hexarelin"] },
  { name: "GHRP-2", category: "Growth hormone", aliases: ["ghrp2"] },
  { name: "GHRP-6", category: "Growth hormone", aliases: ["ghrp6"] },
  { name: "MK-677", category: "Growth hormone", aliases: ["mk677", "ibutamoren"] },
  { name: "Semaglutide", category: "Metabolic", aliases: ["semaglutide", "glp1s", "sema"] },
  { name: "Tirzepatide", category: "Metabolic", aliases: ["tirzepatide", "glp2t", "tirz"] },
  { name: "GLP3 RT", category: "Metabolic", aliases: ["glp3rt", "glp3", "rt", "retatrutide", "glp3r", "reta"] },
  { name: "Cagrilintide", category: "Metabolic", aliases: ["cagrilintide", "cagri"] },
  { name: "AOD-9604", category: "Metabolic", aliases: ["aod9604", "aod"] },
  { name: "MOTS-c", category: "Metabolic", aliases: ["motsc", "mots"] },
  { name: "5-Amino-1MQ", category: "Metabolic", aliases: ["5amino1mq", "aminomq"] },
  { name: "SLU-PP-332", category: "Metabolic", aliases: ["slupp332"] },
  { name: "NAD+", category: "Longevity", aliases: ["nad"] },
  { name: "Epithalon", category: "Longevity", aliases: ["epithalon", "epitalon"] },
  { name: "SS-31", category: "Longevity", aliases: ["ss31", "elamipretide"] },
  { name: "Thymosin Alpha-1", category: "Immune", aliases: ["thymosinalpha1", "ta1"] },
  { name: "LL-37", category: "Immune", aliases: ["ll37"] },
  { name: "Semax", category: "Cognitive", aliases: ["semax"] },
  { name: "Selank", category: "Cognitive", aliases: ["selank"] },
  { name: "DSIP", category: "Sleep", aliases: ["dsip"] },
  { name: "PT-141", category: "Sexual health", aliases: ["pt141", "bremelanotide"] },
  { name: "Melanotan II", category: "Tanning", aliases: ["melanotan2", "melanotanii", "mt2"] },
  { name: "Kisspeptin-10", category: "Hormonal", aliases: ["kisspeptin10", "kisspeptin"] },
  { name: "Oxytocin", category: "Hormonal", aliases: ["oxytocin"] },
  { name: "IGF-1 LR3", category: "Growth", aliases: ["igf1lr3", "igflr3"] },
  { name: "Follistatin-344", category: "Growth", aliases: ["follistatin344", "follistatin"] },
  { name: "Bacteriostatic Water", category: "Supplies", aliases: ["bacteriostaticwater", "bacwater"] },
];

export const aliasKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const slugify = (s: string) => s.toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Returns a match only when confident: an alias of 4+ chars, or a short alias as a whole word. */
export function matchCompound(productName: string): { name: string; confidence: "high" | "none" } {
  const key = aliasKey(productName);
  const words = productName.toLowerCase().split(/[^a-z0-9+]+/).filter(Boolean);
  for (const c of COMPOUNDS) {
    for (const a of c.aliases) {
      if (a.length >= 5 ? key.includes(a) : words.includes(a) || key === a) return { name: c.name, confidence: "high" };
    }
  }
  return { name: "", confidence: "none" };
}

/** Parse strength; total_mg only when there is one unambiguous mg/mcg amount. */
export function parseStrength(text: string): { strength: string | null; totalMg: number | null } {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|iu|ml)\b/gi)];
  if (!matches.length) return { strength: null, totalMg: null };
  const strength = matches.map((m) => `${m[1]}${m[2].toLowerCase()}`).join(" / ");
  const massy = matches.filter((m) => /mg|mcg|µg/i.test(m[2]));
  if (massy.length !== 1 || /\//.test(text.replace(/\d+\s*(mg|mcg)\s*\/\s*vial/gi, ""))) return { strength, totalMg: null };
  const v = parseFloat(massy[0][1]);
  const unit = massy[0][2].toLowerCase();
  return { strength, totalMg: unit === "mg" ? v : v / 1000 };
}
