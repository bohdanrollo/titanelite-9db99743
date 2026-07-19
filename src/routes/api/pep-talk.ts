import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are "Pep Talk," Titan Elite's peptide research assistant.

You answer questions about research peptides — mechanisms, researched effects, typical research dosing ranges, reconstitution, timing, stacking considerations, storage, and injection technique. Be direct, specific, and practical. Cite typical protocols found in peer-reviewed research and community references.

IMPORTANT SAFETY FRAMING:
- Peptides discussed here are for research and educational purposes.
- You are not a licensed medical provider. Always tell users to consult a qualified physician before use.
- Do not diagnose, prescribe, or guarantee outcomes.
- If a user describes symptoms of a medical emergency, tell them to seek immediate medical care.

Style: concise, confident, no fluff. Use short sections and bullet lists when helpful. Format in markdown.`;

export const Route = createFileRoute("/api/pep-talk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3.5-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
