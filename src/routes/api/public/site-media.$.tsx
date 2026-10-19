import { createFileRoute } from "@tanstack/react-router";

/** Public read-only streaming of admin-uploaded homepage images (bucket is private). */
export const Route = createFileRoute("/api/public/site-media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..") || !/^homepage\/[\w.-]+$/.test(path)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("site-media").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        const type = data.type || "image/jpeg";
        if (!type.startsWith("image/") || type.includes("svg")) return new Response("Not found", { status: 404 });
        return new Response(await data.arrayBuffer(), { headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
      },
    },
  },
});
