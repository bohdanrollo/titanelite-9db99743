import { Link } from "@tanstack/react-router";
import { PepLogWordmark } from "@/components/PepLogWordmark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/35 text-foreground">
      <div className="container-edge py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <PepLogWordmark className="h-7 w-auto" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Peptide research, performance tracking, custom programming, and educational protocols in one private record.
          </p>
        </div>
        <div>
          <div className="text-eyebrow mb-4">Site</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/features" className="hover:text-primary">Features</Link></li>
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
            <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-eyebrow mb-4">Legal</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/disclaimer" className="hover:text-primary">Disclaimer</Link></li>
            <li><Link to="/privacy" className="hover:text-primary">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-primary">Terms</Link></li>
            <li><Link to="/auth" className="hover:text-primary">Client Intake</Link></li>
            <li><Link to="/coach" className="hover:text-primary">Coach Portal</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-edge flex flex-col items-center justify-between gap-3 py-6 font-mono text-xs uppercase text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} PepLog</span>
          <span>Educational content only — not medical advice.</span>
        </div>
      </div>
    </footer>
  );
}
