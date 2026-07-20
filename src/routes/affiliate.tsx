import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Copy, DollarSign, Users, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/affiliate")({
  head: () => ({
    meta: [
      { title: "Affiliate Program — Titan Elite" },
      { name: "description", content: "Earn $25 for every 5 people who sign up through your Titan Elite referral link. Apply to join the affiliate program." },
      { property: "og:title", content: "Become a Titan Elite Affiliate" },
      { property: "og:description", content: "Earn $25 for every 5 people who sign up through your referral link." },
    ],
  }),
  component: AffiliatePage,
});

type Affiliate = {
  id: string;
  status: "pending" | "approved" | "rejected";
  code: string | null;
  desired_code: string;
  email: string;
  referral_count: number;
  earnings_cents: number;
  created_at: string;
};

function AffiliatePage() {
  const { user, loading } = useAuth();
  const [existing, setExisting] = useState<Affiliate | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { setChecking(false); return; }
    supabase.from("affiliates")
      .select("id, status, code, desired_code, email, referral_count, earnings_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setExisting(data as Affiliate | null); setChecking(false); });
  }, [user, loading]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SiteHeader />
      <section className="container-edge py-16 flex-1">
        <div className="text-eyebrow">Partnership</div>
        <h1 className="mt-4 text-5xl lg:text-7xl">Become an Affiliate.</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Share Titan Elite with your audience. Earn <span className="text-blood font-semibold">$25 for every 5 people</span> who sign up through your unique referral link.
        </p>

        {checking ? (
          <div className="mt-10 text-eyebrow">Loading…</div>
        ) : existing ? (
          <AffiliateStatus affiliate={existing} />
        ) : (
          <ApplicationForm onSubmitted={(a) => setExisting(a)} />
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function AffiliateStatus({ affiliate }: { affiliate: Affiliate }) {
  if (affiliate.status === "pending") {
    return (
      <div className="mt-10 max-w-2xl border border-foreground/15 p-8">
        <div className="flex items-center gap-3 text-amber-500">
          <Clock size={20} />
          <div className="font-mono text-[11px] uppercase tracking-[0.18em]">Application under review</div>
        </div>
        <h2 className="mt-4 text-3xl">Thanks for applying.</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          We received your application. You'll get an email once you're approved and your referral link is live.
        </p>
        <div className="mt-6 text-xs font-mono text-muted-foreground">
          Requested code: <span className="text-foreground">{affiliate.desired_code}</span>
        </div>
      </div>
    );
  }
  if (affiliate.status === "rejected") {
    return (
      <div className="mt-10 max-w-2xl border border-foreground/15 p-8">
        <div className="flex items-center gap-3 text-blood">
          <XCircle size={20} />
          <div className="font-mono text-[11px] uppercase tracking-[0.18em]">Application not approved</div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          We weren't able to approve your application at this time. Reach out to us if you have questions.
        </p>
      </div>
    );
  }
  return <ApprovedDashboard affiliate={affiliate} />;
}

function ApprovedDashboard({ affiliate }: { affiliate: Affiliate }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/?ref=${affiliate.code}`;
  const earnings = (affiliate.earnings_cents / 100).toFixed(2);
  const nextMilestone = 5 - (affiliate.referral_count % 5);
  const progress = ((affiliate.referral_count % 5) / 5) * 100;

  return (
    <div className="mt-10 space-y-8">
      <div className="flex items-center gap-3 text-emerald-500">
        <CheckCircle2 size={20} />
        <div className="font-mono text-[11px] uppercase tracking-[0.18em]">Approved affiliate</div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-4xl">
        <Stat icon={Users} label="Referrals" value={affiliate.referral_count.toString()} />
        <Stat icon={DollarSign} label="Earnings" value={`$${earnings}`} />
        <Stat icon={Clock} label="Until next $25" value={`${nextMilestone} sign-up${nextMilestone === 1 ? "" : "s"}`} />
      </div>

      <div className="max-w-4xl">
        <div className="text-eyebrow">Progress to next $25</div>
        <div className="mt-3 h-2 bg-foreground/10 overflow-hidden">
          <div className="h-full bg-blood transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-4xl border border-foreground/15 p-6">
        <div className="text-eyebrow">Your referral link</div>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <input readOnly value={link} className="flex-1 bg-background border border-foreground/20 px-4 py-3 font-mono text-sm" />
          <button
            onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}
            className="btn-blood hover:btn-blood-hover flex items-center gap-2 justify-center"
          >
            <Copy size={14} /> Copy link
          </button>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Code: <span className="font-mono text-blood text-lg tracking-wider">{affiliate.code}</span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Anyone who signs up after visiting this link is credited to you. Payouts are processed by the Titan Elite team.
        </p>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="border border-foreground/15 p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <div className="font-mono text-[10px] uppercase tracking-[0.18em]">{label}</div>
      </div>
      <div className="mt-3 font-display text-4xl">{value}</div>
    </div>
  );
}

function ApplicationForm({ onSubmitted }: { onSubmitted: (a: Affiliate) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: user?.email ?? "",
    phone: "",
    desired_code: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    twitter: "",
    other_social: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: user.email ?? "" }));
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const code = form.desired_code.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 2) throw new Error("Desired code must be at least 2 alphanumeric characters");
      const { data, error } = await supabase.from("affiliates").insert({
        full_name: form.full_name || null,
        email: form.email,
        phone: form.phone,
        desired_code: code,
        instagram: form.instagram || null,
        tiktok: form.tiktok || null,
        youtube: form.youtube || null,
        twitter: form.twitter || null,
        other_social: form.other_social || null,
        user_id: user?.id ?? null,
      }).select("id, status, code, desired_code, email, referral_count, earnings_cents, created_at").single();
      if (error) throw error;
      toast.success("Application submitted");
      onSubmitted(data as Affiliate);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 max-w-2xl grid gap-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
        <Field label="Desired code" required value={form.desired_code} onChange={(v) => setForm({ ...form, desired_code: v.toUpperCase() })} placeholder="e.g. JOHN" hint="Letters and numbers only" />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" type="tel" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      </div>

      <div className="text-eyebrow pt-4">Social media (at least one)</div>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Instagram handle" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} placeholder="@handle" />
        <Field label="TikTok handle" value={form.tiktok} onChange={(v) => setForm({ ...form, tiktok: v })} placeholder="@handle" />
        <Field label="YouTube" value={form.youtube} onChange={(v) => setForm({ ...form, youtube: v })} />
        <Field label="X / Twitter" value={form.twitter} onChange={(v) => setForm({ ...form, twitter: v })} placeholder="@handle" />
      </div>
      <Field label="Other (link or notes)" value={form.other_social} onChange={(v) => setForm({ ...form, other_social: v })} />

      <button disabled={busy} className="btn-blood hover:btn-blood-hover w-full sm:w-auto sm:px-10">
        {busy ? "Submitting…" : "Submit application"}
      </button>
      {!user && (
        <p className="text-xs text-muted-foreground">
          Have an account? <Link to="/auth" className="text-blood underline">Sign in</Link> first so we can link your affiliate stats to your dashboard.
        </p>
      )}
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}{required && " *"}</label>
      <input
        type={type} value={value} required={required} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood transition"
      />
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
