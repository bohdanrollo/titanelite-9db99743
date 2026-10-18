export function isPrivateFileRequest(pathname: string): boolean {
  let path: string;
  try { path = decodeURIComponent(pathname); } catch { return true; }
  return /(?:^|\/)\.(?:env(?:\.[^/]*)?|git|dev\.vars|wrangler)(?:\/|$)/i.test(path)
    || /\.(?:server\.[cm]?[jt]sx?|sql|map)$/i.test(path)
    || /^\/(?:AGENTS\.md|roadmap\.md|package(?:-lock)?\.json|bun\.lockb?|vite\.config\.[jt]s|tsconfig\.json)$/i.test(path);
}

export function secureResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (response.status >= 400) headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}