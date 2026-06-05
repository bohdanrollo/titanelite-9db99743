import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Titan Elite" },
      { name: "description", content: "Terms governing use of Titan Elite coaching services." },
      { property: "og:title", content: "Terms of Service — Titan Elite" },
      { property: "og:description", content: "Service terms." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20 max-w-3xl">
        <div className="text-eyebrow">Legal</div>
        <h1 className="mt-4 text-5xl lg:text-7xl">Terms of Service</h1>
        <p className="mt-4 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <P t="Acceptance">By creating an account, submitting intake, or purchasing coaching, you agree to these Terms, the Privacy Policy, and the Disclaimer.</P>
          <P t="Eligibility">You must be at least 18 years old and legally able to enter contracts in your jurisdiction.</P>
          <P t="Services">Titan Elite provides personalized weightlifting programming and educational peptide protocol templates. We do not prescribe, sell, or distribute peptides or other regulated substances.</P>
          <P t="Liability Waiver & Assumption of Risk">Weightlifting carries inherent risk of serious injury or death. You voluntarily assume all risk associated with following any program. You release Titan Elite, its coaches, and affiliates from any and all claims arising from your use of our services to the fullest extent permitted by law.</P>
          <P t="Informed Consent">You acknowledge the Disclaimer in full and confirm you have consulted (or will consult) a licensed medical provider before beginning any new training, supplement, peptide, or hormonal protocol.</P>
          <P t="Payment & Refunds">Coaching fees are billed via Stripe. Initial commitment blocks (typically 12 weeks) are non-refundable once protocols are delivered. Subscriptions auto-renew until cancelled in your dashboard.</P>
          <P t="Intellectual Property">All protocols, written materials, and templates are the IP of Titan Elite and licensed to you for personal, non-commercial use. No resale, redistribution, or public sharing.</P>
          <P t="Account Termination">We may suspend or terminate accounts for fraud, abuse, illegal activity, or violation of these Terms.</P>
          <P t="Governing Law">These Terms are governed by the laws of the jurisdiction of Titan Elite's principal place of business, without regard to conflict-of-law principles.</P>
          <P t="Changes">We may update these Terms; the latest version is always posted here.</P>
          <P t="Contact">coach@titanelite.com</P>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function P({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">{t}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}
