import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are "Pep Talk," Titan Elite's peptide research assistant.

You answer questions about research peptides — mechanisms, researched effects, typical research dosing ranges, reconstitution, timing, stacking considerations, storage, and injection technique. Be direct, specific, and practical.

IMPORTANT SAFETY FRAMING:
- Peptides discussed here are for research and educational purposes.
- You are not a licensed medical provider. Always tell users to consult a qualified physician before use.
- Do not diagnose, prescribe, or guarantee outcomes.
- If a user describes symptoms of a medical emergency, tell them to seek immediate medical care.

Style: concise, confident, no fluff. Use short sections and bullet lists when helpful. Format in markdown.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/pep-talk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify the caller is signed in and has Full Access (server-side paywall).
        const authHeader = request.headers.get("authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !publishable) {
          return new Response("Server not configured", { status: 500 });
        }

        const sb = createClient(supabaseUrl, publishable, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (publishable.startsWith("sb_") && h.get("Authorization") === `Bearer ${publishable}`) {
                h.delete("Authorization");
              }
              h.set("apikey", publishable);
              h.set("Authorization", authHeader);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data: userData, error: userErr } = await sb.auth.getUser();
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        const { data: accessRow, error: accErr } = await sb
          .from("user_access")
          .select("tier")
          .eq("user_id", userData.user.id)
          .eq("tier", "full")
          .maybeSingle();
        if (accErr) {
          console.error("[pep-talk] access check error", accErr);
          return new Response("Access check failed", { status: 500 });
        }
        if (!accessRow) {
          // Admins are also allowed
          const { data: roleRow } = await sb
            .from("user_roles")
            .select("role")
            .eq("user_id", userData.user.id)
            .eq("role", "admin")
            .maybeSingle();
          if (!roleRow) return new Response("Full Access required", { status: 403 });
        }

        const { messages } = (await request.json()) as { messages?: ChatMessage[] };
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const modelMessages: ModelMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3.5-flash"),
          messages: modelMessages,
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
