import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { isPrivateFileRequest, secureResponse } from "@/lib/request-security";

const securityMiddleware = createMiddleware().server(async ({ request, next }) => {
  if (isPrivateFileRequest(new URL(request.url).pathname)) {
    return secureResponse(new Response("Not found", { status: 404 }));
  }
  const result = await next();
  return { ...result, response: secureResponse(result.response) };
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityMiddleware, errorMiddleware],
}));
