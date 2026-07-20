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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
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
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Playfair+Display:wght@400;700&display=swap",
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
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) localStorage.setItem("titan_ref_code", ref.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20));
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
