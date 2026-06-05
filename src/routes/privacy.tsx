import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Titan Elite" },
      { name: "description", content: "How Titan Elite handles your personal and health information." },
      { property: "og:title", content: "Privacy Policy — Titan Elite" },
      { property: "og:description", content: "Our privacy practices." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20 max-w-3xl">
        <div className="text-eyebrow">Legal</div>
        <h1 className="mt-4 text-5xl lg:text-7xl">Privacy Policy</h1>
        <p className="mt-4 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <P t="What We Collect">
            Account info (name, email, phone), intake data (training history, body
            metrics, health information, goals, supplement and medication notes, peptide
            interests, lifestyle habits), uploaded files (progress photos, lab work), and
            usage data (sign-in times, dashboard activity).
          </P>
          <P t="How We Use It">
            To build your custom protocols, communicate with you about coaching, process
            payments, and improve our services. We do not sell your data.
          </P>
          <P t="Health Information">
            We apply HIPAA-inspired safeguards to sensitive health data even where not
            legally required. Data is encrypted in transit and at rest. Access is
            restricted to you and your assigned coach. We are not a covered entity under
            HIPAA and are not a healthcare provider.
          </P>
          <P t="Storage & Security">
            Data is stored with industry-standard cloud providers using row-level
            security, encryption, and audit logging. No system is perfectly secure;
            breaches will be disclosed promptly per applicable law.
          </P>
          <P t="Third Parties">
            We use Stripe (payments), our hosting provider, and email services. Each is
            bound by their own privacy practices and a data processing agreement.
          </P>
          <P t="Your Rights">
            You may request access, correction, or deletion of your data by emailing
            coach@titanelite.com. We will respond within 30 days.
          </P>
          <P t="Cookies">
            We use functional cookies for authentication and session management. No
            advertising cookies.
          </P>
          <P t="Contact">
            Questions: coach@titanelite.com.
          </P>
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
