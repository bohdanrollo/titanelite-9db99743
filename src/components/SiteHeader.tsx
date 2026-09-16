import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PepLogWordmark } from "@/components/PepLogWordmark";

const exploreNav = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/features", label: "Dashboard Features" },
];

const nav = [
  
  { to: "/pephub", label: "PepHub" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/affiliate", label: "Affiliate" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const { user, role } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="container-edge flex h-16 items-center justify-between">
        <Link to="/" className="group flex items-center" aria-label="PepLog home">
          <PepLogWordmark className="h-6 w-auto transition-colors group-hover:text-primary" />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <div
            className="relative"
            onMouseEnter={() => setExploreOpen(true)}
            onMouseLeave={() => setExploreOpen(false)}
          >
            <button
              type="button"
              onClick={() => setExploreOpen((v) => !v)}
               className="flex items-center gap-1 font-mono text-[11px] uppercase text-foreground/80 transition hover:text-primary"
              aria-haspopup="true"
              aria-expanded={exploreOpen}
            >
              Explore <ChevronDown size={12} className={exploreOpen ? "rotate-180 transition" : "transition"} />
            </button>
            {exploreOpen && (
              <div className="absolute left-0 top-full pt-3">
                 <div className="min-w-[220px] border border-border bg-popover shadow-2xl">
                  {exploreNav.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setExploreOpen(false)}
                       className="block px-4 py-3 font-mono text-[11px] uppercase text-foreground/80 transition hover:bg-secondary hover:text-primary"
                       activeProps={{ className: "text-primary" }}
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
               className="font-mono text-[11px] uppercase text-foreground/80 transition hover:text-primary"
               activeProps={{ className: "text-primary" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link to={role === "admin" ? "/admin" : "/dashboard"} className="btn-blood hover:btn-blood-hover">
              {role === "admin" ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <>
               <Link to="/auth" className="font-mono text-[11px] uppercase hover:text-primary">
                Sign in
              </Link>
              <Link to="/auth" className="btn-blood hover:btn-blood-hover">
                Apply
              </Link>
            </>
          )}
        </div>
        <button
          aria-label="Toggle menu"
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-foreground/10 bg-background">
          <div className="container-edge py-4 flex flex-col gap-4">
            <div className="text-eyebrow text-blood">Explore</div>
            {exploreNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="font-mono text-xs uppercase tracking-[0.18em] pl-2"
              >
                {n.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-foreground/10 flex flex-col gap-4">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="font-mono text-xs uppercase tracking-[0.18em]"
                >
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="pt-2 border-t border-foreground/10 flex flex-col gap-3">
              {user ? (
                <Link
                  to={role === "admin" ? "/admin" : "/dashboard"}
                  onClick={() => setOpen(false)}
                  className="btn-blood hover:btn-blood-hover"
                >
                  {role === "admin" ? "Admin" : "Dashboard"}
                </Link>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setOpen(false)} className="btn-ghost">Sign in</Link>
                  <Link to="/auth" onClick={() => setOpen(false)} className="btn-blood hover:btn-blood-hover">Apply</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
