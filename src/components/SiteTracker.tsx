import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getPublicSiteSettings, trackPageView } from "@/lib/admin-ops.functions";

function id(storage: Storage, key: string) {
  let v = storage.getItem(key);
  if (!v) { v = crypto.randomUUID(); storage.setItem(key, v); }
  return v;
}
const device = () => (window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop") as "mobile" | "tablet" | "desktop";

/** Records anonymous page views for the admin Traffic report and shows the site banner. */
export function SiteTracker() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const first = useRef(true);
  useEffect(() => {
    try {
      const referrer = first.current ? document.referrer || undefined : undefined;
      first.current = false;
      trackPageView({ data: { visitorId: id(localStorage, "pl_vid"), sessionId: id(sessionStorage, "pl_sid"), path, referrer, device: device() } }).catch(() => {});
    } catch { /* ignore */ }
  }, [path]);
  return null;
}

export function SiteBanner() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [b, setB] = useState<{ text: string; linkLabel: string; linkUrl: string } | null>(null);
  useEffect(() => { getPublicSiteSettings().then((s) => setB(s.banner)).catch(() => {}); }, []);
  if (!b || !b.text || /^\/(admin|dashboard|coach)/.test(path)) return null;
  return (
    <div className="bg-foreground text-background text-center text-sm px-4 py-2">
      {b.text}{b.linkUrl && b.linkLabel && <> {" "}<a href={b.linkUrl} className="underline underline-offset-2 font-medium">{b.linkLabel}</a></>}
    </div>
  );
}
