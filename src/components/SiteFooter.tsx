import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/10 bg-ink text-bone mt-24">
      <div className="container-edge py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 bg-blood" />
            <span className="font-display text-2xl tracking-wider">TITAN ELITE</span>
          </div>
          <p className="mt-4 max-w-md text-sm text-bone/70 leading-relaxed">
            Engineered physique coaching. Customized weightlifting programming and educational
            peptide protocols for serious clients.
          </p>
        </div>
        <div>
          <div className="text-eyebrow text-blood mb-4">Site</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/features" className="hover:text-blood">Features</Link></li>
            <li><Link to="/about" className="hover:text-blood">About</Link></li>
            <li><Link to="/faq" className="hover:text-blood">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-blood">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-eyebrow text-blood mb-4">Legal</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/disclaimer" className="hover:text-blood">Disclaimer</Link></li>
            <li><Link to="/privacy" className="hover:text-blood">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-blood">Terms</Link></li>
            <li><Link to="/auth" className="hover:text-blood">Client Intake</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-bone/10">
        <div className="container-edge py-6 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-bone/50 font-mono uppercase tracking-[0.18em]">
          <span>© {new Date().getFullYear()} Titan Elite</span>
          <span>Educational content only — not medical advice.</span>
        </div>
      </div>
    </footer>
  );
}
