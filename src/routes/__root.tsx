import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-eyebrow">Error 404</div>
        <h1 className="mt-4 text-7xl">Off Programme</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          That page doesn't exist. Back to the rack.
        </p>
        <div className="mt-8">
          <Link to="/" className="btn-blood hover:btn-blood-hover">Return Home</Link>
        </div>
      </div>
    </div>
  );
}

function isLoadFailure(error: unknown) {
  const msg = String((error as Error)?.message ?? error ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Minified React error #(418|423|520|425)/.test(msg) ||
    /ChunkLoadError|Loading chunk .* failed/i.test(msg)
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  // Transient asset/CDN failures: recover automatically (once) instead of
  // showing an error screen to the visitor.
  useEffect(() => {
    if (typeof window === "undefined" || !isLoadFailure(error)) return;
    const key = "te_asset_reload";
    const attempts = Number(sessionStorage.getItem(key) ?? "0");
    if (attempts >= 2) return;
    sessionStorage.setItem(key, String(attempts + 1));
    const t = setTimeout(() => window.location.reload(), 400);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-eyebrow">Failure</div>
        <h1 className="mt-4 text-4xl">Something Snapped</h1>
        <p className="mt-4 text-sm text-muted-foreground">Reload, or head home and try again.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-blood hover:btn-blood-hover">
            Try again
          </button>
          <a href="/" className="btn-ghost">Go home</a>
        </div>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Titan Elite" },
      { property: "og:site_name", content: "Titan Elite" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Titan Elite — Peptide & Training Dashboard" },
      { property: "og:title", content: "Titan Elite — Peptide & Training Dashboard" },
      { name: "twitter:title", content: "Titan Elite — Peptide & Training Dashboard" },
      { name: "description", content: "All-in-one client dashboard for peptide research and weightlifting: AI peptide answers, 50-compound library, dose calculator, stack tracker, injection guides, and custom protocols." },
      { property: "og:description", content: "All-in-one client dashboard for peptide research and weightlifting: AI peptide answers, 50-compound library, dose calculator, stack tracker, injection guides, and custom protocols." },
      { name: "twitter:description", content: "All-in-one client dashboard for peptide research and weightlifting: AI peptide answers, 50-compound library, dose calculator, stack tracker, injection guides, and custom protocols." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/jI2511rt3aQLGHuXuXGbQ3aWYwN2/social-images/social-1780854871864-IMG_9914.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/jI2511rt3aQLGHuXuXGbQ3aWYwN2/social-images/social-1780854871864-IMG_9914.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Bebas+Neue&family=Hind:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Playfair+Display:wght@400;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Recover from transient script/CDN load failures (a chunk 500s or times out)
  useEffect(() => {
    const key = "te_asset_reload";
    const recover = () => {
      const attempts = Number(sessionStorage.getItem(key) ?? "0");
      if (attempts >= 2) return;
      sessionStorage.setItem(key, String(attempts + 1));
      window.location.reload();
    };
    const onPreloadError = (e: Event) => { e.preventDefault(); recover(); };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isLoadFailure(e.reason)) recover();
    };
    window.addEventListener("vite:preloadError", onPreloadError as EventListener);
    window.addEventListener("unhandledrejection", onRejection);
    // Successful load → clear the retry counter
    const clear = setTimeout(() => sessionStorage.removeItem(key), 4000);
    return () => {
      window.removeEventListener("vite:preloadError", onPreloadError as EventListener);
      window.removeEventListener("unhandledrejection", onRejection);
      clearTimeout(clear);
    };
  }, []);

  useEffect(() => {

    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        const code = ref.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
        localStorage.setItem("titan_ref_code", code);
        // Fire-and-forget click tracking (server validates the code)
        const lastKey = `titan_ref_click_${code}`;
        const last = Number(localStorage.getItem(lastKey) ?? 0);
        // dedupe: 1 click per code per 30 min per browser
        if (Date.now() - last > 30 * 60 * 1000) {
          localStorage.setItem(lastKey, String(Date.now()));
          import("@/lib/affiliates.functions").then(({ trackAffiliateClick }) => {
            trackAffiliateClick({ data: {
              code,
              referrer: document.referrer || undefined,
              path: window.location.pathname,
              userAgent: navigator.userAgent,
            } }).catch(() => { /* silent */ });
          });
        }
      }
    } catch { /* ignore */ }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <main>
          <Outlet />
        </main>
        <Toaster theme="dark" position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
