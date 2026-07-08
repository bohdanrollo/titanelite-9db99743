import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";

const nav = [
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, role } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/85 backdrop-blur">
      <div className="container-edge flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="inline-block h-3 w-3 bg-blood group-hover:rotate-45 transition-transform" />
          <span className="font-display text-xl tracking-wider">TITAN ELITE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 hover:text-blood transition"
              activeProps={{ className: "text-blood" }}
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
              <Link to="/auth" className="font-mono text-[11px] uppercase tracking-[0.18em] hover:text-blood">
                Sign in
              </Link>
              <Link to="/intake" className="btn-blood hover:btn-blood-hover">
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
                  <Link to="/intake" onClick={() => setOpen(false)} className="btn-blood hover:btn-blood-hover">Apply</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
