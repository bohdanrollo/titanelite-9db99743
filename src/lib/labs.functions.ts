import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LabAnalysisRow = {
  id: string;
  age: number | null;
  height: string | null;
  weight: string | null;
  sex: string | null;
  notes: string | null;
  file_paths: string[];
  analysis: string | null;
  analyzed_at: string | null;
  updated_at: string;
};

type SaveInput = {
  age: string;
  height: string;
  weight: string;
  sex: string;
  notes: string;
  file_paths: string[];
};

export const getLabAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lab_analyses")
      .select("id, age, height, weight, sex, notes, file_paths, analysis, analyzed_at, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as LabAnalysisRow | null) ?? null;
  });

const SYSTEM_PROMPT = `You are an educational health-data assistant for Titan Elite, a fitness and peptide-research coaching platform.
You review a client's blood panel results plus their basic stats (age, sex, height, weight) and produce a clear, structured educational review.

Rules:
- You are NOT a doctor. Never diagnose, prescribe, or give medical orders. Frame everything as education and general lifestyle guidance.
- Recommend consulting a licensed physician for anything clinically significant or out of range.
- Never recommend specific prescription drug doses.

Output clean markdown with these sections:
## Snapshot
Short summary including BMI (calculated from the height/weight given, state the units you assumed) and overall impression.
## Markers Outside Optimal Range
A markdown table: | Marker | Your Value | Typical Reference | What It Suggests |
Only include markers actually present in the uploads. If no lab values could be read, say so plainly.
## In Good Shape
Bullet list of markers that look solid.
## How To Improve
For each flagged area: concrete nutrition, training, sleep, and supplement-category suggestions (no prescription dosing).
## Retest & Follow-Up
What to recheck and roughly when, and which findings warrant seeing a physician soon.
## Disclaimer
One short paragraph: educational only, not medical advice.`;

export const saveAndAnalyzeLabs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const ageNum = data.age.trim() ? Number.parseInt(data.age, 10) : null;

    const { data: existing } = await supabase
      .from("lab_analyses")
      .select("id, file_paths")
      .eq("user_id", userId)
      .maybeSingle();

    const paths = data.file_paths.length
      ? data.file_paths
      : ((existing?.file_paths as string[] | undefined) ?? []);

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured. Please try again later.");

    // Build multimodal content from the stored lab files.
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Client stats:
- Age: ${ageNum ?? "not provided"}
- Sex: ${data.sex || "not provided"}
- Height: ${data.height || "not provided"}
- Weight: ${data.weight || "not provided"}
- Notes / goals / symptoms: ${data.notes || "none provided"}

Attached are the client's blood panel documents. Read every value you can and produce the review.`,
      },
    ];

    for (const path of paths.slice(0, 6)) {
      const { data: file, error } = await supabase.storage.from("client-uploads").download(path);
      if (error || !file) continue;
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.byteLength === 0) continue;
      const base64 = buf.toString("base64");
      const mime = file.type || (path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      if (mime === "application/pdf") {
        content.push({
          type: "file",
          file: { filename: path.split("/").pop() ?? "labs.pdf", file_data: `data:${mime};base64,${base64}` },
        });
      } else {
        content.push({ type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } });
      }
    }

    if (content.length === 1) {
      throw new Error("Upload at least one readable blood panel file (PDF or image) before analyzing.");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Analysis is busy right now — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please contact your coach.");
    if (!res.ok) throw new Error(`Analysis failed (${res.status}): ${(await res.text()).slice(0, 300)}`);

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const analysis = json.choices?.[0]?.message?.content?.trim();
    if (!analysis) throw new Error("Analysis came back empty. Please try again.");

    const row = {
      user_id: userId,
      age: ageNum,
      height: data.height || null,
      weight: data.weight || null,
      sex: data.sex || null,
      notes: data.notes || null,
      file_paths: paths,
      analysis,
      analyzed_at: new Date().toISOString(),
    };

    const { data: saved, error: saveErr } = await supabase
      .from("lab_analyses")
      .upsert(row, { onConflict: "user_id" })
      .select("id, age, height, weight, sex, notes, file_paths, analysis, analyzed_at, updated_at")
      .single();
    if (saveErr) throw new Error(saveErr.message);

    return saved as LabAnalysisRow;
  });
