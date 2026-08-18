import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { resolveRecruiterCode, getMyAffiliateStats } from "@/lib/affiliates.functions";
import { submitAffiliateVideo, listMyAffiliateVideos } from "@/lib/affiliate-videos.functions";
import { Copy, DollarSign, Users, Clock, CheckCircle2, XCircle, UserPlus, MousePointerClick, TrendingUp, Award, BarChart3, Video } from "lucide-react";

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
  recruit_earnings_cents: number;
  video_earnings_cents: number;
  lifetime_earnings_cents: number;
  lifetime_recruit_earnings_cents: number;
  lifetime_video_earnings_cents: number;
  click_count: number;
  last_paid_at: string | null;
  recruiter_affiliate_id: string | null;
  created_at: string;
};


type Recruit = {
  id: string;
  full_name: string | null;
  email: string;
  status: "pending" | "approved" | "rejected";
  code: string | null;
  referral_count: number;
  created_at: string;
};

function AffiliatePage() {
  const { user, loading } = useAuth();
  const [existing, setExisting] = useState<Affiliate | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { setChecking(false); return; }
    const email = user.email ?? "";
    supabase.from("affiliates")
      .select("id, status, code, desired_code, email, referral_count, earnings_cents, recruit_earnings_cents, video_earnings_cents, lifetime_earnings_cents, lifetime_recruit_earnings_cents, lifetime_video_earnings_cents, click_count, last_paid_at, recruiter_affiliate_id, created_at")
      .or(`user_id.eq.${user.id}${email ? `,email.ilike.${email}` : ""}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setExisting(data as Affiliate | null); setChecking(false); });
  }, [user, loading]);

  useEffect(() => {
    if (!existing?.id) return;
    const channel = supabase
      .channel(`affiliate-${existing.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "affiliates", filter: `id=eq.${existing.id}` },
        (payload) => setExisting((prev) => prev ? { ...prev, ...(payload.new as Partial<Affiliate>) } : prev))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [existing?.id]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SiteHeader />
      <section className="container-edge py-16 flex-1">
        <div className="text-eyebrow">Partnership</div>
        <h1 className="mt-4 text-5xl lg:text-7xl">Become an Affiliate.</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Share Titan Elite with your audience. Earn <span className="text-blood font-semibold">$25 for every 5 people</span> who sign up through your unique referral link — plus <span className="text-blood font-semibold">$5 for every 5 signups</span> your recruited sub-affiliates drive.
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
  const signupLink = `${origin}/?ref=${affiliate.code}`;
  const recruitLink = `${origin}/affiliate?recruit=${affiliate.code}`;
  const directEarnings = (affiliate.earnings_cents / 100).toFixed(2);
  const recruitEarnings = (affiliate.recruit_earnings_cents / 100).toFixed(2);
  const videoEarnings = ((affiliate.video_earnings_cents ?? 0) / 100).toFixed(2);
  const totalEarnings = ((affiliate.earnings_cents + affiliate.recruit_earnings_cents + (affiliate.video_earnings_cents ?? 0)) / 100).toFixed(2);
  const nextMilestone = 5 - (affiliate.referral_count % 5);
  const progress = ((affiliate.referral_count % 5) / 5) * 100;

  const lifetimeTotal = ((affiliate.lifetime_earnings_cents + affiliate.lifetime_recruit_earnings_cents + (affiliate.lifetime_video_earnings_cents ?? 0)) / 100).toFixed(2);

  const [tab, setTab] = useState<"overview" | "referrals" | "analytics" | "recruits" | "incentives">("overview");
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [loadingRecruits, setLoadingRecruits] = useState(true);
  const statsFn = useServerFn(getMyAffiliateStats);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getMyAffiliateStats>> | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    supabase.from("affiliates")
      .select("id, full_name, email, status, code, referral_count, created_at")
      .eq("recruiter_affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRecruits((data as Recruit[] | null) ?? []);
        setLoadingRecruits(false);
      });
  }, [affiliate.id]);

  useEffect(() => {
    setLoadingStats(true);
    statsFn({ data: { affiliateId: affiliate.id } })
      .then((s) => setStats(s))
      .catch(() => { /* silent */ })
      .finally(() => setLoadingStats(false));
  }, [affiliate.id, statsFn]);

  const approvedRecruits = useMemo(() => recruits.filter((r) => r.status === "approved"), [recruits]);
  const drivenRevenue = ((stats?.totalRevenueCents ?? 0) / 100).toFixed(2);
  const payingReferrals = (stats?.referrals ?? []).filter((r: { paid: boolean }) => r.paid).length;

  return (
    <div className="mt-10 space-y-8">
      <div className="flex items-center gap-3 text-emerald-500">
        <CheckCircle2 size={20} />
        <div className="font-mono text-[11px] uppercase tracking-[0.18em]">Approved affiliate</div>
        {affiliate.last_paid_at && (
          <div className="text-xs text-muted-foreground font-mono">
            Last paid {new Date(affiliate.last_paid_at).toLocaleDateString()}
          </div>
        )}
      </div>

      <nav className="flex gap-1 border-b border-foreground/15 max-w-5xl overflow-x-auto">
        {([
          { k: "overview", l: "Overview", i: DollarSign },
          { k: "referrals", l: `Referrals (${affiliate.referral_count})`, i: Users },
          { k: "analytics", l: "Analytics", i: BarChart3 },
          { k: "recruits", l: `Recruits (${approvedRecruits.length})`, i: UserPlus },
          { k: "incentives", l: "Video incentives", i: Video },
        ] as const).map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 border-b-2 whitespace-nowrap transition ${tab === t.k ? "border-blood text-blood" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.i size={14} /> {t.l}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl">
            <Stat icon={Users} label="Direct referrals" value={affiliate.referral_count.toString()} />
            <Stat icon={MousePointerClick} label="Link clicks" value={(affiliate.click_count ?? 0).toString()} />
            <Stat icon={TrendingUp} label="Driven revenue" value={`$${drivenRevenue}`} />
            <Stat icon={DollarSign} label="Total owed" value={`$${totalEarnings}`} accent />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl">
            <Stat icon={DollarSign} label="Direct owed" value={`$${directEarnings}`} />
            <Stat icon={UserPlus} label="Recruit owed" value={`$${recruitEarnings}`} />
            <Stat icon={Video} label="Video owed" value={`$${videoEarnings}`} />
            <Stat icon={Award} label="Lifetime earned" value={`$${lifetimeTotal}`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl">
            <Stat icon={CheckCircle2} label="Paying referrals" value={payingReferrals.toString()} />
          </div>


          <div className="max-w-5xl">
            <div className="text-eyebrow">Progress to next $25 (direct)</div>
            <div className="mt-3 h-2 bg-foreground/10 overflow-hidden">
              <div className="h-full bg-blood transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{nextMilestone} more direct sign-up{nextMilestone === 1 ? "" : "s"} to your next $25.</div>
          </div>


          <div className="max-w-4xl border border-foreground/15 p-6">
            <div className="text-eyebrow">Your referral link</div>
            <p className="mt-1 text-xs text-muted-foreground">Anyone who signs up after visiting this link is credited to you ($25 per 5 signups).</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <input readOnly value={signupLink} className="flex-1 bg-background border border-foreground/20 px-4 py-3 font-mono text-sm" />
              <button
                onClick={() => { navigator.clipboard.writeText(signupLink); toast.success("Link copied"); }}
                className="btn-blood hover:btn-blood-hover flex items-center gap-2 justify-center"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Code: <span className="font-mono text-blood text-lg tracking-wider">{affiliate.code}</span>
            </div>
          </div>

          <div className="max-w-4xl border border-foreground/15 p-6">
            <div className="text-eyebrow">Recruit sub-affiliates</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Share this link with people who want to become affiliates themselves. Once approved, you'll earn <span className="text-blood font-semibold">$5 for every 5 people they refer</span> — on top of whatever you earn from your own direct signups.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <input readOnly value={recruitLink} className="flex-1 bg-background border border-foreground/20 px-4 py-3 font-mono text-sm" />
              <button
                onClick={() => { navigator.clipboard.writeText(recruitLink); toast.success("Recruit link copied"); }}
                className="btn-blood hover:btn-blood-hover flex items-center gap-2 justify-center"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "referrals" && (
        <div className="max-w-5xl">
          {loadingStats ? (
            <div className="text-eyebrow">Loading…</div>
          ) : (stats?.referrals ?? []).length === 0 ? (
            <div className="border border-foreground/15 p-8 text-center">
              <Users size={28} className="mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No referrals yet. Share your referral link to start earning.
              </p>
            </div>
          ) : (
            <div className="border border-foreground/15 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-eyebrow">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.referrals ?? []).map((r: { id: string; full_name: string | null; email: string | null; paid: boolean; revenue_cents: number; created_at: string }) => (
                    <tr key={r.id} className="border-t border-foreground/10">
                      <td className="p-3">{r.full_name || "—"}</td>
                      <td className="p-3 text-muted-foreground break-all">{r.email || "—"}</td>
                      <td className="p-3">
                        {r.paid ? (
                          <span className="inline-block px-2 py-0.5 border border-emerald-500/40 text-emerald-500 font-mono text-[9px] uppercase tracking-[0.18em]">Paid</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 border border-foreground/20 text-muted-foreground font-mono text-[9px] uppercase tracking-[0.18em]">Free</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-right">${(r.revenue_cents / 100).toFixed(2)}</td>
                      <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "analytics" && (
        <div className="max-w-5xl space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={MousePointerClick} label="Total clicks" value={(affiliate.click_count ?? 0).toString()} />
            <Stat icon={MousePointerClick} label="Clicks (30d)" value={(stats?.last30Clicks ?? 0).toString()} />
            <Stat icon={TrendingUp} label="Conversion" value={`${(stats?.conversionRate ?? 0).toFixed(1)}%`} />
            <Stat icon={DollarSign} label="Driven revenue" value={`$${drivenRevenue}`} />
          </div>

          <div className="border border-foreground/15 p-6">
            <div className="text-eyebrow">Clicks per day (last 30 days)</div>
            {loadingStats ? (
              <div className="mt-4 text-xs text-muted-foreground">Loading…</div>
            ) : Object.keys(stats?.clicksByDay ?? {}).length === 0 ? (
              <div className="mt-4 text-xs text-muted-foreground">No clicks yet in the last 30 days.</div>
            ) : (
              <div className="mt-4 flex items-end gap-1 h-40">
                {Array.from({ length: 30 }).map((_, i) => {
                  const day = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
                  const count = stats?.clicksByDay?.[day] ?? 0;
                  const max = Math.max(1, ...Object.values(stats?.clicksByDay ?? { z: 1 }));
                  const h = count === 0 ? 2 : Math.max(6, (count / max) * 100);
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${day}: ${count} click${count === 1 ? "" : "s"}`}>
                      <div className={`w-full ${count > 0 ? "bg-blood" : "bg-foreground/10"}`} style={{ height: `${h}%` }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border border-foreground/15 overflow-x-auto">
            <div className="p-4 text-eyebrow border-b border-foreground/10">Recent clicks</div>
            {loadingStats ? (
              <div className="p-4 text-xs text-muted-foreground">Loading…</div>
            ) : (stats?.recentClicks ?? []).length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No clicks recorded yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-eyebrow">
                  <tr>
                    <th className="p-3">When</th>
                    <th className="p-3">Landed on</th>
                    <th className="p-3">Came from</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentClicks ?? []).map((c: { created_at: string; path: string | null; referrer: string | null }, idx: number) => (
                    <tr key={idx} className="border-t border-foreground/10">
                      <td className="p-3 font-mono text-xs">{new Date(c.created_at).toLocaleString()}</td>
                      <td className="p-3 font-mono text-xs">{c.path || "/"}</td>
                      <td className="p-3 text-xs text-muted-foreground break-all">{c.referrer || "direct"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "recruits" && (
        <div className="max-w-4xl">
          {loadingRecruits ? (
            <div className="text-eyebrow">Loading…</div>
          ) : recruits.length === 0 ? (
            <div className="border border-foreground/15 p-8 text-center">
              <UserPlus size={28} className="mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No recruits yet. Share your recruit link on the Overview tab to invite sub-affiliates.
              </p>
            </div>
          ) : (
            <div className="border border-foreground/15 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-eyebrow">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Signups they drove</th>
                    <th className="p-3">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {recruits.map((r) => (
                    <tr key={r.id} className="border-t border-foreground/10">
                      <td className="p-3">{r.full_name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{r.email}</td>
                      <td className="p-3"><RecruitBadge status={r.status} /></td>
                      <td className="p-3 font-mono">{r.status === "approved" ? r.referral_count : "—"}</td>
                      <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "incentives" && (
        <VideoIncentives affiliateId={affiliate.id} videoOwed={videoEarnings} lifetimeVideo={((affiliate.lifetime_video_earnings_cents ?? 0) / 100).toFixed(2)} />
      )}



      <div className="max-w-5xl border border-foreground/15 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-eyebrow">Affiliate community</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Join the private Discord for updates, tips, and direct support.
          </p>
        </div>
        <a
          href="https://discord.gg/wFWvtAmkx"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2"
        >
          JOIN DISCORD
        </a>
      </div>
    </div>
  );
}

type VideoRow = {
  id: string;
  url: string;
  platform: string | null;
  claimed_views: number;
  approved_views: number | null;
  status: "pending" | "approved" | "declined";
  payout_cents: number;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function VideoIncentives({ affiliateId, videoOwed, lifetimeVideo }: { affiliateId: string; videoOwed: string; lifetimeVideo: string }) {
  const listFn = useServerFn(listMyAffiliateVideos);
  const submitFn = useServerFn(submitAffiliateVideo);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [views, setViews] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    listFn({ data: { affiliateId } })
      .then((r) => setVideos((r.videos as VideoRow[]) ?? []))
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }
  useEffect(load, [affiliateId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) { toast.error("Paste your video link"); return; }
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          affiliateId,
          url: url.trim(),
          platform: platform.trim() || undefined,
          claimedViews: views.trim() ? Math.max(0, Math.round(Number(views))) : undefined,
        },
      });
      toast.success("Video submitted for review");
      setUrl(""); setPlatform(""); setViews("");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not submit video");
    } finally { setSubmitting(false); }
  }

  const approvedTotal = videos.filter((v) => v.status === "approved").reduce((s, v) => s + v.payout_cents, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="border border-blood p-6">
        <div className="text-eyebrow text-blood">Video incentive program</div>
        <h3 className="mt-2 font-display text-3xl">Get paid $1 per 1,000 views.</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Make a video about Titan Elite — a review, a walkthrough of the client dashboard, your results, anything honest.
          Once it passes <span className="text-foreground font-semibold">1,000 views</span>, drop the link below.
          We verify the view count and credit <span className="text-blood font-semibold">$1 for every 1,000 views</span> to your earnings.
        </p>
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground font-mono">
          <li>· Videos under 1,000 views earn $0 — resubmit once you cross the threshold.</li>
          <li>· Payout is rounded down per full 1,000 views (4,800 views = $4.80).</li>
          <li>· The video must clearly mention Titan Elite and stay publicly viewable.</li>
          <li>· Each video is reviewed and approved or declined manually.</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat icon={DollarSign} label="Video earnings owed" value={`$${videoOwed}`} accent />
        <Stat icon={Award} label="Lifetime video paid" value={`$${lifetimeVideo}`} />
        <Stat icon={Video} label="Approved videos" value={videos.filter((v) => v.status === "approved").length.toString()} />
      </div>

      <form onSubmit={onSubmit} className="border border-foreground/15 p-6 space-y-4">
        <div className="text-eyebrow">Submit a video</div>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…video link"
            className="md:col-span-3 bg-background border border-foreground/20 px-4 py-3 text-sm"
          />
          <input
            value={platform} onChange={(e) => setPlatform(e.target.value)}
            placeholder="Platform (TikTok, YouTube…)"
            className="bg-background border border-foreground/20 px-4 py-3 text-sm"
          />
          <input
            value={views} onChange={(e) => setViews(e.target.value)}
            type="number" min="0" step="1"
            placeholder="Current view count"
            className="bg-background border border-foreground/20 px-4 py-3 text-sm font-mono"
          />
          <button type="submit" disabled={submitting} className="btn-blood hover:btn-blood-hover disabled:opacity-40">
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </form>

      <div className="border border-foreground/15 overflow-x-auto">
        <div className="p-4 text-eyebrow border-b border-foreground/10">
          Your submissions {approvedTotal > 0 && <span className="text-blood">· ${(approvedTotal / 100).toFixed(2)} approved all-time</span>}
        </div>
        {loading ? (
          <div className="p-4 text-xs text-muted-foreground">Loading…</div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center">
            <Video size={28} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No videos submitted yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-eyebrow">
              <tr>
                <th className="p-3">Video</th>
                <th className="p-3">Platform</th>
                <th className="p-3 text-right">Views</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Earned</th>
                <th className="p-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} className="border-t border-foreground/10">
                  <td className="p-3 max-w-[220px]">
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blood hover:underline break-all text-xs">{v.url}</a>
                    {v.admin_notes && <div className="mt-1 text-[11px] text-muted-foreground">Note: {v.admin_notes}</div>}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{v.platform || "—"}</td>
                  <td className="p-3 font-mono text-right">{(v.approved_views ?? v.claimed_views ?? 0).toLocaleString()}</td>
                  <td className="p-3"><VideoBadge status={v.status} /></td>
                  <td className="p-3 font-mono text-right">${(v.payout_cents / 100).toFixed(2)}</td>
                  <td className="p-3 font-mono text-xs">{new Date(v.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function VideoBadge({ status }: { status: "pending" | "approved" | "declined" }) {
  const cls = status === "approved" ? "text-emerald-500 border-emerald-500/40"
    : status === "declined" ? "text-blood border-blood/40"
    : "text-amber-500 border-amber-500/40";
  return <span className={`inline-block px-2 py-0.5 border font-mono text-[9px] uppercase tracking-[0.18em] ${cls}`}>{status}</span>;
}


function RecruitBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const cls = status === "approved" ? "text-emerald-500 border-emerald-500/40"
    : status === "rejected" ? "text-blood border-blood/40"
    : "text-amber-500 border-amber-500/40";
  return <span className={`inline-block px-2 py-0.5 border font-mono text-[9px] uppercase tracking-[0.18em] ${cls}`}>{status}</span>;
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border p-5 ${accent ? "border-blood" : "border-foreground/15"}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <div className="font-mono text-[10px] uppercase tracking-[0.18em]">{label}</div>
      </div>
      <div className={`mt-3 font-display text-4xl ${accent ? "text-blood" : ""}`}>{value}</div>
    </div>
  );
}

function ApplicationForm({ onSubmitted }: { onSubmitted: (a: Affiliate) => void }) {
  const { user } = useAuth();
  const resolveRecruiter = useServerFn(resolveRecruiterCode);
  const [recruiterCode, setRecruiterCode] = useState<string | null>(null);
  const [recruiterId, setRecruiterId] = useState<string | null>(null);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("recruit");
    if (!code) return;
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized) return;
    setRecruiterCode(normalized);
    resolveRecruiter({ data: { code: normalized } })
      .then((res) => { if (res.affiliateId) setRecruiterId(res.affiliateId); })
      .catch(() => { /* silent */ });
  }, [resolveRecruiter]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const code = form.desired_code.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 2) throw new Error("Desired code must be at least 2 alphanumeric characters");
      const { error } = await supabase.from("affiliates").insert({
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
        recruiter_affiliate_id: recruiterId,
      } as any);
      if (error) throw error;
      const mineEmail = form.email;
      const { data: mine } = await supabase.from("affiliates")
        .select("id, status, code, desired_code, email, referral_count, earnings_cents, recruit_earnings_cents, video_earnings_cents, lifetime_earnings_cents, lifetime_recruit_earnings_cents, lifetime_video_earnings_cents, click_count, last_paid_at, recruiter_affiliate_id, created_at")
        .or(`user_id.eq.${user?.id ?? "00000000-0000-0000-0000-000000000000"}${mineEmail ? `,email.ilike.${mineEmail}` : ""}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      toast.success("Application submitted");
      if (mine) onSubmitted(mine as Affiliate);

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 max-w-2xl grid gap-5">
      {recruiterCode && (
        <div className={`border p-4 flex items-center gap-3 ${recruiterId ? "border-emerald-500/40 text-emerald-500" : "border-amber-500/40 text-amber-500"}`}>
          <UserPlus size={16} />
          <div className="text-sm">
            {recruiterId ? (
              <>Recruited by affiliate <span className="font-mono text-foreground">{recruiterCode}</span> — they'll earn a bonus when you drive signups.</>
            ) : (
              <>Recruit code <span className="font-mono">{recruiterCode}</span> not recognized. Your application will still be submitted without a recruiter.</>
            )}
          </div>
        </div>
      )}
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
