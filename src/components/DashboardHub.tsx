import type { ComponentType } from "react";
import { Lock, Users, BarChart3, LayoutGrid, BookOpen } from "lucide-react";

export type Hub = "coaching" | "tracking" | "tools" | "learn";

export type HubTile = {
  k: string;
  l: string;
  sub: string;
  color: "lilac" | "peach" | "sky" | "mint" | "pink" | "aqua";
  icon: ComponentType<{ size?: number }>;
  locked: boolean;
  tall?: boolean;
};

const HERO: Record<Hub, { title: string; sub: string; color: HubTile["color"]; section: string }> = {
  coaching: { title: "Your coaching", sub: "Plans, calls and messages with your coach", color: "lilac", section: "Your coaching" },
  tracking: { title: "Today's stack", sub: "Log doses, workouts, progress and wellness", color: "peach", section: "Your tracking" },
  tools: { title: "Smart tools", sub: "Ask, plan and calculate with research-based guidance", color: "pink", section: "Your tools" },
  learn: { title: "Learn the basics", sub: "Peptides, mixing, training and more", color: "sky", section: "Your library" },
};

function WeekStrip() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <div className="mt-5 grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const on = d.toDateString() === today.toDateString();
        return (
          <div key={d.toISOString()} className={`flex flex-col items-center rounded-full py-2.5 text-xs ${on ? "dash-pill-on" : "bg-card border border-border"}`}>
            <span className="opacity-70">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
            <span className="mt-0.5 font-medium">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardHubView({ hub, tiles, onOpen, extra }: { hub: Hub; tiles: HubTile[]; onOpen: (k: string, locked: boolean) => void; extra?: React.ReactNode }) {
  const h = HERO[hub];
  return (
    <div>
      <div className={`tile tile-${h.color} p-6 sm:p-8 min-h-40 flex flex-col justify-end`}>
        <h2 className="text-3xl sm:text-4xl font-semibold leading-tight tracking-tight">{h.title}</h2>
        <p className="mt-2 text-sm opacity-75 max-w-sm">{h.sub}</p>
      </div>
      {(hub === "coaching" || hub === "tracking") && <WeekStrip />}
      {extra}
      <div className="mt-7 flex items-baseline justify-between">
        <h3 className="text-xl font-medium">{h.section}</h3>
        <span className="text-xs text-muted-foreground">{tiles.length} {hub === "learn" ? "topics" : "tools"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <button
            key={t.k}
            onClick={() => onOpen(t.k, t.locked)}
            className={`tile tile-${t.color} text-left p-4 flex flex-col justify-between transition hover:-translate-y-0.5 ${t.tall ? "row-span-2 min-h-56" : "min-h-28"} ${t.locked ? "opacity-60" : ""}`}
          >
            <span className="flex items-center justify-between">
              <t.icon size={18} />
              {t.locked && <span className="tile-chip rounded-full px-2 py-0.5 text-[10px] inline-flex items-center gap-1"><Lock size={10} /> Upgrade</span>}
            </span>
            <span>
              <span className="block text-lg font-medium leading-tight">{t.l}</span>
              <span className="mt-1 block text-xs opacity-70">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const DOCK: { k: Hub; l: string; i: ComponentType<{ size?: number }> }[] = [
  { k: "coaching", l: "Coaching", i: Users },
  { k: "tracking", l: "Tracking", i: BarChart3 },
  { k: "tools", l: "Tools", i: LayoutGrid },
  { k: "learn", l: "Learn", i: BookOpen },
];

export function DashboardDock({ hub, onSelect }: { hub: Hub; onSelect: (h: Hub) => void }) {
  return (
    <nav className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 dash-dock rounded-full p-1.5 flex gap-1 shadow-lg" aria-label="Dashboard sections">
      {DOCK.map((d) => (
        <button
          key={d.k}
          onClick={() => onSelect(d.k)}
          aria-label={d.l}
          aria-current={hub === d.k ? "page" : undefined}
          className={`h-11 rounded-full flex items-center justify-center gap-2 transition ${hub === d.k ? "dash-dock-on px-4" : "dash-dock-off w-14 hover:opacity-100"}`}
        >
          <d.i size={18} />
          {hub === d.k && <span className="text-sm font-medium">{d.l}</span>}
        </button>
      ))}
    </nav>
  );
}
