import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink, Mail, ShieldCheck, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { joinPepHub, type PepSource } from "@/lib/pephub.functions";

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
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const join = useServerFn(joinPepHub);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pephub_sources")
        .select("id, name, url, description, category, discount_code, is_active, sort_order, created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      setSources((data ?? []) as PepSource[]);
      setReady(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    try {
      await join({ data: { name: name.trim(), email: email.trim() } });
      setJoined(true);
      toast.success("You're on the PepHub list.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />

      <section className="container-edge flex-1 py-14">
        <div className="text-eyebrow">PepHub — Free</div>
        <h1 className="mt-4 max-w-3xl text-5xl lg:text-6xl">Trusted peptide sources, in one place.</h1>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          We keep a short, vetted list of sources we actually trust. Sign up with your name and email
          and we'll let you know whenever one of them runs a sale or drops a discount code.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          {/* Sources */}
          <div>
            <div className="flex items-center gap-2 text-eyebrow">
              <ShieldCheck size={14} className="text-blood" /> The list
            </div>

            {ready && sources.length === 0 && (
              <div className="mt-6 rounded-2xl border border-foreground/10 bg-card p-8 shadow-sm">
                <h2 className="text-2xl">Sources coming soon.</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We're finalizing the first round of vetted sources. Join the list on the right and
                  you'll be the first to see them — and the first to hear about their sales.
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {sources.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blood/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={16} className="text-blood" />
                        <h3 className="text-xl">{s.name}</h3>
                      </div>
                      {s.category && (
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {s.category}
                        </div>
                      )}
                    </div>
                    <ExternalLink size={15} className="mt-1 text-muted-foreground group-hover:text-blood" />
                  </div>
                  {s.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  )}
                  {s.discount_code && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blood/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-blood">
                      <Tag size={12} /> Code {s.discount_code}
                    </div>
                  )}
                </a>
              ))}
            </div>

            <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Titan Elite does not sell, ship, or supply any product. These are independent
              third-party sources listed for research purposes only. Nothing here is medical advice.
            </p>
          </div>

          {/* Signup */}
          <div className="lg:sticky lg:top-24 h-fit rounded-2xl border border-foreground/10 bg-card p-7 shadow-sm">
            {joined ? (
              <>
                <Mail className="text-blood" size={22} />
                <h2 className="mt-4 text-2xl">You're on the list.</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  We'll email {email} whenever a trusted source runs a sale or discount. Nothing else,
                  no spam.
                </p>
              </>
            ) : (
              <>
                <div className="text-eyebrow">Get sale alerts</div>
                <h2 className="mt-3 text-2xl">Join PepHub free.</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Name and email — that's it. No account, no card.
                </p>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <div>
                    <label className="text-eyebrow" htmlFor="ph-name">Name</label>
                    <input
                      id="ph-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={120}
                      className="mt-2 w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm outline-none focus:border-blood"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-eyebrow" htmlFor="ph-email">Email</label>
                    <input
                      id="ph-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={200}
                      className="mt-2 w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm outline-none focus:border-blood"
                      placeholder="you@email.com"
                    />
                  </div>
                  <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
                    {busy ? "Signing you up…" : "Get sale alerts"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
