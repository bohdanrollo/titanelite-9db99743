import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink, Mail, ShieldCheck, Tag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { type PepSource } from "@/lib/pephub.functions";
import { pephubAccess, pephubSignup, pephubSubscribeCurrentUser } from "@/lib/pephub-access.functions";
import zeerowLogoAsset from "@/assets/zeerow-logo.jpeg.asset.json";

export const Route = createFileRoute("/pephub/")({
  head: () => ({
    meta: [
      { title: "PepHub — Trusted Peptide Sources & Sale Alerts | Titan Elite" },
      {
        name: "description",
        content:
          "PepHub is a free, vetted list of trusted peptide sources. Sign up with your name and email to get notified whenever a listed source runs a sale or discount.",
      },
      { property: "og:title", content: "PepHub — Trusted Peptide Sources" },
      {
        property: "og:description",
        content: "A vetted list of trusted peptide sources, plus free email alerts when they run sales or discounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PepHub,
});

function PepHub() {
  const [sources, setSources] = useState<PepSource[]>([]);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [showZeerowPopup, setShowZeerowPopup] = useState(false);
  const [showLegalShieldPopup, setShowLegalShieldPopup] = useState(false);
  const signup = useServerFn(pephubSignup);
  const checkAccess = useServerFn(pephubAccess);
  const subscribeMe = useServerFn(pephubSubscribeCurrentUser);

  async function refreshAccess() {
    setChecking(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setSignedIn(false);
        setHasAccess(false);
        return;
      }
      setSignedIn(true);
      const res = await checkAccess({ data: {} });
      setHasAccess(Boolean(res.subscribed));
    } catch {
      setSignedIn(false);
      setHasAccess(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void refreshAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasAccess) return;
    (async () => {
      const { data } = await supabase
        .from("pephub_sources")
        .select("id, name, url, affiliate_url, description, category, discount_code, logo_url, instagram_url, x_url, facebook_url, telegram_url, reddit_url, other_social_url, monitor_socials, newsletter_signup_url, newsletter_email_domains, newsletter_subscribed, is_active, expert_verified, listing_category, sort_order, created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      setSources((data ?? []) as PepSource[]);
      setReady(true);
    })();
  }, [hasAccess]);

  useEffect(() => {
    try {
      if (localStorage.getItem("zeerow_popup_closed") === "1") return;
    } catch { /* ignore */ }
    setShowZeerowPopup(true);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("legalshield_popup_closed_v2") === "1") return;
    } catch { /* ignore */ }
    setShowLegalShieldPopup(true);
  }, []);

  function closeZeerowPopup() {
    setShowZeerowPopup(false);
    try {
      localStorage.setItem("zeerow_popup_closed", "1");
    } catch { /* ignore */ }
  }

  function closeLegalShieldPopup() {
    setShowLegalShieldPopup(false);
    try {
      localStorage.setItem("legalshield_popup_closed_v2", "1");
    } catch { /* ignore */ }
  }

  const featured = sources.filter((s) => s.listing_category === "featured");
  const trusted = sources.filter((s) => s.listing_category === "trusted");
  const more = sources.filter((s) => s.listing_category === "more");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim() || !email.trim() || password.length < 8) {
          toast.error("Name, email and a password of at least 8 characters are required.");
          return;
        }
        const res = await signup({
          data: { name: name.trim(), email: email.trim(), password },
        });
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          toast.error(
            res.existingAccount
              ? "That email already has an account — sign in with your existing password."
              : error.message,
          );
          if (res.existingAccount) setMode("login");
          return;
        }
        toast.success("You're in — welcome to PepHub.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
      }
      setPassword("");
      await refreshAccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function optIn() {
    setBusy(true);
    try {
      await subscribeMe({ data: { name: name.trim() || undefined } });
      toast.success("You're on the PepHub list.");
      await refreshAccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />

      <a
        href="https://zeerow.io/"
        target="_blank"
        rel="noopener noreferrer"
        className="group block w-full border-b border-blood/30 bg-blood/10 px-4 py-2.5 text-center transition hover:bg-blood/15"
      >
        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-blood">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blood/30 bg-blood/10 px-2 py-0.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blood" />
            RUO Processor
          </span>
          <span className="text-foreground/80">
            Zeerow is a payment processor for high-risk merchants.
          </span>
          <span className="inline-flex items-center gap-1 underline decoration-blood/50 underline-offset-2 transition group-hover:decoration-blood">
            Put in an application today and get instant approval
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70"
            >
              <path d="M7 7h10v10" />
              <path d="M7 17 17 7" />
            </svg>
          </span>
        </span>
      </a>

      <section className="container-edge flex-1 py-10 lg:py-14">
        <div className="text-eyebrow">PepHub — Free</div>
        <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">Trusted peptide sources, in one place.</h1>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          We keep a short, vetted list of sources we actually trust. Sign up with your name and email
          and we'll let you know whenever one of them runs a sale or drops a discount code.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
          {/* Sources */}
          <div>
            <div className="flex items-center gap-2 text-eyebrow">
              <ShieldCheck size={14} className="text-blood" /> The list
            </div>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 align-middle rounded-full border border-blood/30 bg-blood/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                <ShieldCheck size={10} /> Expert Verified
              </span>{" "}
              means our team has personally checked this source for product quality, reliable shipping,
              responsive customer service, and transparent business practices. Not every listed source
              carries this badge — only the ones that meet our standards.
            </p>

            {ready && sources.length === 0 && (
              <div className="mt-6 rounded-2xl border border-foreground/10 bg-card p-8 shadow-sm">
                <h2 className="text-2xl">Sources coming soon.</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We're finalizing the first round of vetted sources. Join the list on the right and
                  you'll be the first to see them — and the first to hear about their sales.
                </p>
              </div>
            )}

            <SourceGroup
              title="Featured sources"
              blurb="Our top picks — the sources we recommend first."
              sources={featured}
              prominent
            />
            <SourceGroup title="Trusted sources" sources={trusted} />
            <SourceGroup title="More sources" sources={more} />

            <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Titan Elite does not sell, ship, or supply any product. These are independent
              third-party sources listed for research purposes only. Nothing here is medical advice.
            </p>
          </div>

          {/* Signup */}
          <div className="space-y-6">
            {showZeerowPopup && (
              <div className="animate-enter relative overflow-hidden rounded-2xl border border-blood/30 bg-card p-5 shadow-lg">
                <button
                  type="button"
                  onClick={closeZeerowPopup}
                  className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                  aria-label="Close Zeerow promo"
                >
                  <X size={16} />
                </button>

                <div className="flex items-start gap-4">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-foreground/10 shadow">
                    <img
                      src={zeerowLogoAsset.url}
                      alt="Zeerow logo"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-blood/30 bg-blood/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blood" />
                      RUO Processor
                    </div>

                    <h3 className="mt-2 text-lg font-semibold leading-tight">
                      Payments made simple for high-risk merchants.
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Zeerow is a payment processor built for high-risk businesses. Put in an application today and get instant approval.
                    </p>

                    <a
                      href="https://zeerow.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary mt-4 inline-flex"
                      onClick={closeZeerowPopup}
                    >
                      Apply now at Zeerow
                      <ExternalLink size={14} className="ml-2" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {showLegalShieldPopup && (
              <div className="animate-enter relative overflow-hidden rounded-2xl border border-blood/30 bg-card p-5 shadow-lg">
                <button
                  type="button"
                  onClick={closeLegalShieldPopup}
                  className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                  aria-label="Close LegalShield promo"
                >
                  <X size={16} />
                </button>

                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-blood/10 shadow">
                    <ShieldCheck size={30} className="text-blood" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-blood/30 bg-blood/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blood" />
                      Meta Rep
                    </div>

                    <h3 className="mt-2 text-lg font-semibold leading-tight">
                      LegalShield for content creator accounts.
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Get legal protection and Meta representation for your content creator accounts —
                      account issues, appeals, contracts, and more, backed by real attorneys.
                    </p>

                    <a
                      href="https://bohdanrollo.legalshieldassociate.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary mt-4 inline-flex"
                    >
                      Get LegalShield
                      <ExternalLink size={14} className="ml-2" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="lg:sticky lg:top-24 h-fit rounded-2xl border border-foreground/10 bg-card p-7 shadow-sm">
              <Mail className="text-blood" size={22} />
              <h2 className="mt-4 text-2xl">You're on the list.</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                We'll email you whenever a trusted source runs a sale or discount. Nothing else, no
                spam. You can unsubscribe from any email — that also ends your PepHub access.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SourceGroup({
  title,
  blurb,
  sources,
  prominent = false,
}: {
  title: string;
  blurb?: string;
  sources: PepSource[];
  prominent?: boolean;
}) {
  if (sources.length === 0) return null;
  return (
    <div className={prominent ? "mt-6" : "mt-8 border-t border-foreground/10 pt-6"}>
      <div className={`text-eyebrow ${prominent ? "text-blood" : ""}`}>{title}</div>
      {blurb && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{blurb}</p>}
      <div className={`mt-4 grid gap-3 ${prominent ? "sm:gap-4" : "sm:grid-cols-2 sm:gap-4"}`}>
        {sources.map((s) => (
          <SourceCard key={s.id} source={s} prominent={prominent} />
        ))}
      </div>
    </div>
  );
}

function SourceCard({ source: s, prominent }: { source: PepSource; prominent: boolean }) {
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`group rounded-2xl bg-card transition hover:-translate-y-0.5 hover:border-blood/40 hover:shadow-md ${
        prominent
          ? "border-2 border-blood/30 p-5 shadow-md sm:p-8"
          : "border border-foreground/10 p-4 shadow-sm sm:p-6"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {s.logo_url && (
            <img
              src={s.logo_url}
              alt={`${s.name} logo`}
              loading="lazy"
              className={`shrink-0 rounded-lg border border-foreground/10 bg-background object-contain p-1 ${
                prominent ? "h-14 w-14 sm:h-16 sm:w-16" : "h-10 w-10 sm:h-12 sm:w-12"
              }`}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BadgeCheck size={16} className="shrink-0 text-blood" />
              <h3 className={`truncate font-semibold ${prominent ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"}`}>
                {s.name}
              </h3>
            </div>
            {s.expert_verified && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blood/30 bg-blood/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                <ShieldCheck size={12} /> Expert Verified
              </div>
            )}
            {s.category && (
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {s.category}
              </div>
            )}
          </div>
        </div>
        <ExternalLink size={15} className="mt-1 shrink-0 text-muted-foreground group-hover:text-blood" />
      </div>
      {s.description && (
        <p className={`mt-3 leading-relaxed text-muted-foreground ${prominent ? "text-sm sm:text-base" : "text-sm"}`}>
          {s.description}
        </p>
      )}
      {s.discount_code && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blood/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-blood">
          <Tag size={12} /> Code {s.discount_code}
        </div>
      )}
    </a>
  );
}
