import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import transform1 from "@/assets/transform-1.jpg.asset.json";
import transform2 from "@/assets/transform-2.jpg.asset.json";
import transform3 from "@/assets/transform-3.jpg.asset.json";
import transform4 from "@/assets/transform-4.jpg.asset.json";
import transform5 from "@/assets/transform-5.jpg.asset.json";
import transform6 from "@/assets/transform-6.jpg.asset.json";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Client Results — Titan Elite" },
      { name: "description", content: "Real client transformations and testimonials from the Titan Elite dashboard and custom protocols." },
      { property: "og:title", content: "Client Results — Titan Elite" },
      { property: "og:description", content: "Real client transformations and testimonials from the Titan Elite dashboard and custom protocols." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const t = [
    { q: "The dose calculator finally made peptide math click. I know exactly how much to draw every time.", a: "Marcus R.", s: "Uses Dose Calculator + My Stack" },
    { q: "I used to have 12 tabs open to research compounds. Now I just search the library in the dashboard.", a: "Daniel K.", s: "Uses Top 50 Peptides daily" },
    { q: "Pep Talk AI answers questions at 10 PM when I’m planning my next dose. It’s like having a research assistant.", a: "Jess T.", s: "Uses Pep Talk AI + Injection Guide" },
  ];
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <section className="container-edge py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 lg:sticky lg:top-24 self-start">
            <div className="text-eyebrow">Results</div>
            <h1 className="mt-4 text-5xl lg:text-6xl">Track the work.</h1>
            <p className="mt-6 text-muted-foreground">
              Your 100% custom educational peptide protocol and weight-programming plan, stack, and progress live in the dashboard. Consistency + the right tools = results.
            </p>
            <Link to="/auth" className="mt-8 btn-blood hover:btn-blood-hover inline-flex">Get dashboard access</Link>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[transform1.url, transform2.url, transform3.url, transform4.url, transform5.url, transform6.url].map((src, i) => (
              <div key={i} className="relative overflow-hidden aspect-[4/5]">
                <img src={src} alt={`Client transformation ${i + 1}`} loading="lazy" className="size-full object-cover hover:scale-105 transition duration-700" />
                <div className="absolute bottom-2 left-2 text-bone font-mono text-[9px] uppercase tracking-[0.2em] bg-ink/70 px-2 py-1">
                  Client / {String(i + 1).padStart(3, "0")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-background border-y border-foreground/10 py-24">
        <div className="container-edge">
          <div className="text-eyebrow">Dashboard Reports</div>
          <h2 className="mt-4 text-5xl lg:text-6xl mb-12">From the tools.</h2>
          <div className="grid lg:grid-cols-3 gap-px bg-foreground/15">
            {t.map((x) => (
              <figure key={x.a} className="bg-background p-8">
                <div className="text-blood font-serif text-5xl leading-none">"</div>
                <blockquote className="mt-2 text-lg leading-relaxed">{x.q}</blockquote>
                <figcaption className="mt-6 pt-6 border-t border-foreground/10">
                  <div className="font-display text-xl">{x.a}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">{x.s}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
