import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PepLogWordmark } from "@/components/PepLogWordmark";
import { Button } from "@/components/ui/button";

const exploreNav = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/features", label: "Dashboard Features" },
];

const nav = [
  
  { to: "/pephub", label: "PepHub" },
  { to: "/peptide-calculator", label: "Calculator" },
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
          <PepLogWordmark className="h-5 w-auto transition-colors group-hover:text-primary" />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <div
            className="relative"
            onMouseEnter={() => setExploreOpen(true)}
            onMouseLeave={() => setExploreOpen(false)}
          >
            <Button
              variant="ghost"
              type="button"
              onClick={() => setExploreOpen(true)}
               className="h-auto gap-1 p-0 header-link hover:bg-transparent"
              aria-haspopup="true"
              aria-expanded={exploreOpen}
            >
              Explore <ChevronDown size={12} className={exploreOpen ? "rotate-180 transition" : "transition"} />
            </Button>
            {exploreOpen && (
              <div className="absolute left-0 top-full pt-3">
                 <div className="min-w-[220px] border border-border bg-popover shadow-2xl">
                  {exploreNav.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setExploreOpen(false)}
                       className="block px-4 py-3 header-link hover:bg-secondary"
                       activeProps={{ className: "font-semibold" }}
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
               className="header-link"
               activeProps={{ className: "font-semibold" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link to={role === "admin" ? "/admin" : "/dashboard"} className="btn-black">
              {role === "admin" ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <>
               <Link to="/auth" className="header-link">
                Sign in
              </Link>
              <Link to="/auth" className="btn-black">
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
            <div className="header-link font-semibold">Explore</div>
            {exploreNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="header-link pl-2"
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
                  className="header-link"
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
                  className="btn-black"
                >
                  {role === "admin" ? "Admin" : "Dashboard"}
                </Link>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setOpen(false)} className="btn-ghost font-landing normal-case tracking-normal">Sign in</Link>
                  <Link to="/auth" onClick={() => setOpen(false)} className="btn-black">Apply</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
