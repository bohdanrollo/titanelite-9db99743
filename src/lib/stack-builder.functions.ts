import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Compounds stocked by Powerbuilt Labs (the Titan Elite partner supplier) — the
// stack builder must only recommend from this list.
const PBL_CATALOG = [
  "BPC-157", "TB-500", "Wolverine (BPC-157 + TB-500 blend)", "GLOW (GHK-Cu + BPC-157 + TB-500 blend)",
  "GHK-Cu", "AHK-Cu", "CJC-1295 No DAC + Ipamorelin", "CJC-1295 w/ DAC", "Ipamorelin",
  "Tesamorelin", "IGF-1 LR3", "MOTS-c", "SS-31", "NAD+", "GLP2-TZ (tirzepatide analog)",
  "GLP3-RT (retatrutide analog)", "Cagrilintide", "KLOW", "KPV", "Glutathione",
  "PT-141", "Melanotan I", "Melanotan II", "Semax", "Selank", "Adamax", "Kisspeptin",
];

const SYSTEM_PROMPT = `You are Titan Elite's educational peptide stack builder.

Given a client's goal and context, suggest a research-oriented peptide stack for educational purposes. Be specific and practical.

CRITICAL CATALOG RULE:
- Only recommend compounds from this approved supplier catalog (Powerbuilt Labs): ${PBL_CATALOG.join(", ")}.
- Never suggest any peptide, blend, or compound that is not on this list. If the ideal compound for the goal is not in the catalog, pick the closest catalog option instead.
- End the "Recommended Research Stack" section with one line: "All of the above are available through Powerbuilt Labs — Titan Elite clients save 30% with code TITAN30."

Rules:
- Peptides discussed are for research and educational purposes only. You are not a medical provider; remind the user to consult a qualified physician before use.
- Never diagnose or guarantee outcomes.

Output clean markdown with these sections:
## Recommended Research Stack
A markdown table: | Compound | Typical Research Dose | Timing | Purpose |
## Why This Stack
2-4 short bullets explaining the synergy for their goal.
## Schedule Example
A simple daily/weekly schedule (morning / afternoon / evening).
## Cycling & Duration
How long research cycles typically run and break guidance.
## Safety Notes
Key cautions, what to watch for, and when to see a physician.
## Disclaimer
One short paragraph: educational only, not medical advice.`;

type BuildInput = { goal: string; details: string };

export const buildStack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BuildInput) => ({
    goal: String(input.goal ?? "").slice(0, 80),
    details: String(input.details ?? "").slice(0, 2000),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!data.goal) throw new Error("Pick a goal first.");

    // Full Access only (admins allowed too).
    const { data: accessRows } = await supabase
      .from("user_access")
      .select("tier")
      .eq("user_id", userId)
      .eq("tier", "full")
      .limit(1);
    if (!accessRows || accessRows.length === 0) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .limit(1);
      if (!roleRows || roleRows.length === 0) {
        throw new Error("Full Access required for the AI Stack Builder.");
      }
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured. Please try again later.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Goal: ${data.goal}\nClient context: ${data.details || "none provided"}\n\nBuild the educational research stack.`,
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The stack builder is busy right now — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please contact your coach.");
    if (!res.ok) throw new Error(`Stack build failed (${res.status}). Please try again.`);

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("The stack builder returned nothing. Please try again.");
    return { result: text };
  });
