import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Titan Elite" },
      { name: "description", content: "Titan Elite is an all-in-one peptide research and training dashboard: custom educational protocols, Pep Talk AI, a 50-compound library, dose calculator, stack tracker, and injection guides." },
      { property: "og:title", content: "About — Titan Elite" },
      { property: "og:description", content: "Titan Elite is an all-in-one peptide research and training dashboard with custom educational protocols and nine built-in tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20 max-w-4xl">
        <div className="text-eyebrow">About</div>
        <h1 className="mt-4 text-6xl lg:text-7xl">Coaching as a craft.</h1>
        <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
          <p>
            Titan Elite was built around one principle: serious clients deserve programming
            that's actually designed for them. Not a template. Not a PDF someone bought once
            and resold a thousand times. A real document built around your training history,
            your goals, and your physiology.
          </p>
          <p>
            We've coached lifters and physique competitors for over a decade, and we've spent
            the last several years studying the educational landscape around peptide
            protocols — what's evidence-informed, what's hype, and how to think about it
            responsibly. Every client receives a 100% custom educational peptide protocol and
            weight-programming plan delivered as a PDF and attached to their dashboard.
          </p>
          <p>
            Titan Elite does not prescribe, sell, or distribute peptides. Everything shared
            is strictly educational and intended to inform conversations with your licensed
            medical provider.
          </p>
        </div>

        <div className="mt-16">
          <div className="text-eyebrow">The Dashboard</div>
          <h2 className="mt-4 text-4xl lg:text-5xl">Nine tools. One place.</h2>
          <p className="mt-6 leading-relaxed">
            The dashboard is the product. When you become a client, you get access to every
            tool we've built for peptide research and training — no scattered notes, no
            twelve open tabs, no guesswork.
          </p>
          <ul className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {[
              ["Custom Protocols", "Your 100% custom educational peptide protocol and weight-programming plan, delivered as a PDF."],
              ["Pep Talk AI", "Ask questions about effects, dosing, timing, stacking, and safety — instant research answers."],
              ["Top 50 Peptides", "A searchable research library covering the most popular compounds and what each is studied for."],
              ["My Stack", "Track every peptide, dose, unit, frequency, schedule, and notes in your personal dosing log."],
              ["Dose Calculator", "Input vial strength, desired dose, and BAC water to see the exact draw on a 1 mL syringe."],
              ["Reconstitution Guide", "Step-by-step mixing instructions — roll the vial gently, never shake."],
              ["Injection Guide", "Subcutaneous injection site diagrams, rotation advice, and sterile technique."],
              ["Supplies Guide", "BAC water, insulin syringes, alcohol wipes, plus storage before and after reconstitution."],
              ["Lifting & Nutrition", "Training splits, popular lifts, and caloric / macro targets for bulking, cutting, or maintenance."],
            ].map(([title, desc]) => (
              <li key={title} className="border-l-2 border-blood pl-4">
                <div className="font-display text-lg text-foreground">{title}</div>
                <p className="text-muted-foreground mt-1">{desc}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-16 border-t border-foreground/10 pt-10">
          <h2 className="text-3xl lg:text-4xl">How it works</h2>
          <ol className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
            <li><span className="font-mono text-blood text-xs mr-2">01</span>Create an account and land on your dashboard immediately.</li>
            <li><span className="font-mono text-blood text-xs mr-2">02</span>Fill out the intake when you're ready — goals, training history, health background, peptide interests.</li>
            <li><span className="font-mono text-blood text-xs mr-2">03</span>We build your 100% custom protocol and weight-programming plan.</li>
            <li><span className="font-mono text-blood text-xs mr-2">04</span>Your PDF is delivered to your dashboard and you get an email notification.</li>
            <li><span className="font-mono text-blood text-xs mr-2">05</span>Use the tools every day — track your stack, calculate doses, ask Pep Talk, keep training.</li>
          </ol>
        </div>

        <div className="mt-14 flex flex-wrap gap-4">
          <Link to="/auth" className="btn-blood hover:btn-blood-hover">Get dashboard access</Link>
          <Link to="/features" className="btn-ghost hover:bg-foreground hover:text-background">See all features</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
