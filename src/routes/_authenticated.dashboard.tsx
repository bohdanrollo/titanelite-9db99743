import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAccess, isTabAllowed } from "@/lib/access";
import { FileText, Droplets, LogOut, Download, Beaker, Package, FlaskConical, Syringe, Dumbbell, Calculator as CalculatorIcon, MessageCircle, MessagesSquare, Send, Loader2, ListChecks, Plus, Pencil, Trash2, X, BookOpen, ChevronDown, Lock, GraduationCap, Scale, XCircle, CheckCircle, Activity, Apple, TrendingUp, HeartPulse, NotebookPen, Sparkles, CreditCard } from "lucide-react";
import injectionSitesAsset from "@/assets/injection-sites.jpg.asset.json";
import { getProtocolDownloadUrl } from "@/lib/protocols.functions";
import ReactMarkdown from "react-markdown";
import PeptideLibrary from "@/components/PeptideLibrary";
import DosingGuide from "@/components/DosingGuide";

import { ClientMessages } from "@/components/Messaging";
import LabAnalysis from "@/components/LabAnalysis";
import Nutrition from "@/components/Nutrition";
import DoseTracker, { SLOTS, DAY_LABELS, inferSchedule, type Slot } from "@/components/DoseTracker";
import ProgressTracker from "@/components/ProgressTracker";
import WellnessTracker from "@/components/WellnessTracker";
import WorkoutLogger from "@/components/WorkoutLogger";
import StackBuilder from "@/components/StackBuilder";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

function ManageSubscriptionButton() {
  const openPortal = useServerFn(createPortalSession);
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const env = getStripeEnvironment();
          const res = await openPortal({ data: { environment: env, returnUrl: window.location.href } });
          if ("error" in res) throw new Error(res.error);
          window.open(res.url, "_blank", "noopener,noreferrer");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not open billing portal");
        } finally {
          setBusy(false);
        }
      }}
      className="shrink-0 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 hover:text-blood disabled:opacity-50"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
      <span className="hidden sm:inline">Manage subscription</span>
    </button>
  );
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Client Dashboard — Titan Elite" }] }),
  component: Dashboard,
});

type Tab = "protocols" | "messages" | "peptalk" | "peptides" | "dosing" | "mystack" | "supplies" | "reconstitution" | "injection" | "calculator" | "lifting" | "combos" | "learning" | "myths" | "labs" | "nutrition" | "progress" | "wellness" | "workouts" | "stackbuilder";


function Dashboard() {
  const { user, signOut } = useAuth();
  const { tier, loading: accessLoading, isAdmin } = useAccess();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("peptides");
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [intake, setIntake] = useState<{ id: string; status: string; submitted_at: string } | null>(null);
  const [isAffiliate, setIsAffiliate] = useState(false);

  // If user has no access, keep them on paywall regardless of `tab` state.
  const hasAccess = isAdmin || tier === "limited" || tier === "full";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("intakes").select("id, status, submitted_at").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setIntake(data));
    supabase.from("affiliates").select("id", { count: "exact", head: true }).eq("email", user.email ?? "").then(({ count }) => setIsAffiliate(!!count && count > 0));
  }, [user]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-foreground/10">
        <div className="container-edge h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 bg-blood" />
            <span className="font-display text-base sm:text-xl tracking-wider truncate">TITAN ELITE</span>
          </Link>
          <button onClick={signOut} className="shrink-0 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 hover:text-blood">
            <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>

      </header>
      <section className="container-edge py-8 sm:py-12">
        <div className="text-eyebrow">Client Dashboard</div>
        <h1 className="mt-4 text-3xl sm:text-5xl lg:text-6xl">Welcome back.</h1>
        {!isAffiliate && (
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 text-blood font-medium">
              <CheckCircle size={14} />
              Congrats! As a Titan Elite client you get 30% off of all peptides with code TITAN30
            </span>
            <span className="mx-2">·</span>
            Order through{" "}
            <a href="https://powerbuiltlabs.com/us?ref=TITAN30" target="_blank" rel="noopener noreferrer" className="text-blood hover:underline">
              Powerbuilt Labs
            </a>.
          </p>
        )}

        {intake && (
          <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6 border-y border-foreground/10 py-4 text-sm">
            <div><span className="text-eyebrow block">Status</span><span className="font-display text-lg sm:text-xl">{intake.status}</span></div>
            <div><span className="text-eyebrow block">Submitted</span><span className="font-display text-lg sm:text-xl">{new Date(intake.submitted_at).toLocaleDateString()}</span></div>
          </div>
        )}

        {!accessLoading && tier === "limited" && (
          <div className="mt-8 border border-blood/40 bg-blood/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-eyebrow text-blood">Limited Access</div>
              <div className="mt-1 font-display text-xl sm:text-2xl">Upgrade to Full Access</div>
              <p className="mt-1 text-sm text-muted-foreground">Unlock custom peptide + training protocols and direct messaging with your coach. $49.99 first payment, then $10.99/month. Cancel anytime.</p>
            </div>
            <button
              onClick={() => nav({ to: "/checkout" })}
              className="btn-blood hover:btn-blood-hover shrink-0"
            >
              Upgrade
            </button>
          </div>
        )}

        {accessLoading ? (
          <div className="mt-10 text-eyebrow">Loading access…</div>
        ) : !hasAccess ? (
          <PaywallCard />
        ) : (
        <>
        <nav ref={navRef} className="mt-8 sm:mt-10 -mx-4 sm:mx-0 border-b border-foreground/15 px-4 sm:px-0 pb-3">
          {(() => {
            const allTabs = [
              { k: "protocols", l: "Protocols", i: FileText, g: "Plan" },
              { k: "messages", l: "Messages", i: MessagesSquare, g: "Plan" },
              { k: "mystack", l: "My Stack", i: ListChecks, g: "Plan" },
              { k: "progress", l: "Progress", i: TrendingUp, g: "Track" },
              { k: "workouts", l: "Workouts", i: NotebookPen, g: "Track" },
              { k: "wellness", l: "Wellness", i: HeartPulse, g: "Track" },
              { k: "stackbuilder", l: "Stack Builder", i: Sparkles, g: "Assistant" },
              { k: "peptides", l: "Peptides", i: Beaker, g: "Research" },
              { k: "dosing", l: "Dosing Guide", i: Syringe, g: "Research" },
              { k: "combos", l: "Combos", i: BookOpen, g: "Research" },

              { k: "lifting", l: "Lifting", i: Dumbbell, g: "Research" },
              { k: "learning", l: "Learning", i: GraduationCap, g: "Research" },
              { k: "myths", l: "Myth vs Evidence", i: Scale, g: "Research" },
              { k: "labs", l: "Lab Analysis", i: Activity, g: "Tools" },
              { k: "nutrition", l: "Calorie Tracker", i: Apple, g: "Tools" },
              { k: "calculator", l: "Calculator", i: CalculatorIcon, g: "Tools" },

              { k: "supplies", l: "Supplies", i: Droplets, g: "Tools" },
              { k: "reconstitution", l: "Reconstitution", i: FlaskConical, g: "Tools" },
              { k: "injection", l: "Injection", i: Syringe, g: "Tools" },
              { k: "peptalk", l: "Pep Talk", i: MessageCircle, g: "Assistant" },
            ].map((t) => ({ ...t, locked: !isTabAllowed(t.k, tier, isAdmin) })) as Array<{ k: Tab; l: string; i: typeof FileText; g: string; locked: boolean }>;
            const active = allTabs.find((t) => t.k === tab) ?? allTabs[0];
            const groups = ["Plan", "Track", "Research", "Tools", "Assistant"] as const;
            return (
              <>
                {/* Mobile: compact dropdown */}
                <div className="sm:hidden relative">
                  <button
                    onClick={() => setNavOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 border border-foreground/15 px-3 py-2.5 text-left"
                  >
                    <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
                      <active.i size={14} className="text-blood" /> {active.l}
                    </span>
                    <ChevronDown size={14} className={`transition ${navOpen ? "rotate-180" : ""}`} />
                  </button>
                  {navOpen && (
                    <div className="absolute z-20 mt-1 w-full border border-foreground/15 bg-card shadow-lg max-h-[70vh] overflow-y-auto">
                      {groups.map((g) => (
                        <div key={g}>
                          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground bg-muted/50">
                            {g}
                          </div>
                          {allTabs.filter((t) => t.g === g).map((t) => (
                            <button
                              key={t.k}
                              onClick={() => {
                                setNavOpen(false);
                                if (t.locked) { nav({ to: "/checkout" }); return; }
                                setTab(t.k);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition ${tab === t.k && !t.locked ? "bg-blood/10 text-blood" : t.locked ? "text-muted-foreground/60 hover:bg-muted" : "hover:bg-muted"}`}
                            >
                              <span className="flex items-center gap-2"><t.i size={14} /> {t.l}</span>
                              {t.locked && <Lock size={11} />}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Desktop: grouped compact tabs */}
                <div className="hidden sm:flex flex-wrap items-start gap-x-6 gap-y-4 lg:gap-x-8">
                  {groups.map((g) => (
                    <div key={g} className="flex flex-col gap-1 min-w-0">
                      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground px-1">
                        {g}
                      </span>
                      <div className="flex flex-wrap items-center">
                        {allTabs.filter((t) => t.g === g).map((t, idx, arr) => (
                          <button
                            key={t.k}
                            onClick={() => {
                              if (t.locked) { nav({ to: "/checkout" }); return; }
                              setTab(t.k);
                            }}
                            className={`shrink-0 px-3 lg:px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] flex items-center gap-1.5 border-b-2 transition ${tab === t.k && !t.locked ? "border-blood text-blood" : t.locked ? "border-transparent text-muted-foreground/50 hover:text-muted-foreground" : "border-transparent text-muted-foreground hover:text-foreground"} ${idx < arr.length - 1 ? "mr-1" : ""}`}
                            title={t.locked ? `${t.l} — upgrade to unlock` : t.l}
                          >
                            <t.i size={14} /> {t.l}{t.locked && <Lock size={10} className="ml-0.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </nav>

        <div className="mt-8">
          {tab === "protocols" && isTabAllowed("protocols", tier, isAdmin) && <Protocols />}
          {tab === "messages" && isTabAllowed("messages", tier, isAdmin) && user && <ClientMessages myId={user.id} />}
          {tab === "peptalk" && isTabAllowed("peptalk", tier, isAdmin) && <PepTalk />}
          {tab === "peptides" && isTabAllowed("peptides", tier, isAdmin) && <Peptides />}
          {tab === "dosing" && isTabAllowed("dosing", tier, isAdmin) && <DosingGuide />}

          {tab === "mystack" && isTabAllowed("mystack", tier, isAdmin) && <MyStack />}
          {tab === "supplies" && isTabAllowed("supplies", tier, isAdmin) && <Supplies />}
          {tab === "reconstitution" && isTabAllowed("reconstitution", tier, isAdmin) && <Reconstitution />}
          {tab === "injection" && isTabAllowed("injection", tier, isAdmin) && <Injection />}
          {tab === "calculator" && isTabAllowed("calculator", tier, isAdmin) && <PeptideCalculator />}
          {tab === "labs" && isTabAllowed("labs", tier, isAdmin) && <LabAnalysis />}
          {tab === "nutrition" && isTabAllowed("nutrition", tier, isAdmin) && <Nutrition />}

          {tab === "lifting" && isTabAllowed("lifting", tier, isAdmin) && <Lifting />}
          {tab === "combos" && isTabAllowed("combos", tier, isAdmin) && <Combos />}
          {tab === "learning" && isTabAllowed("learning", tier, isAdmin) && <Learning />}
          {tab === "myths" && isTabAllowed("myths", tier, isAdmin) && <Myths />}
          {tab === "progress" && isTabAllowed("progress", tier, isAdmin) && <ProgressTracker />}
          {tab === "wellness" && isTabAllowed("wellness", tier, isAdmin) && <WellnessTracker />}
          {tab === "workouts" && isTabAllowed("workouts", tier, isAdmin) && <WorkoutLogger />}
          {tab === "stackbuilder" && isTabAllowed("stackbuilder", tier, isAdmin) && <StackBuilder />}
          {hasAccess && (
            <div className="mt-16 pt-6 border-t border-foreground/5 flex justify-center">
              <ManageSubscriptionButton />
            </div>
          )}
        </div>
        </>
        )}
      </section>
    </div>
  );
}

function PaywallCard() {
  return (
    <div className="mt-10 border border-foreground/15 p-6 sm:p-10 text-center max-w-2xl mx-auto">
      <Lock size={40} className="mx-auto text-blood" />
      <div className="text-eyebrow mt-4">Locked</div>
      <h2 className="mt-3 font-display text-3xl sm:text-4xl">Unlock the dashboard</h2>
      <p className="mt-4 text-sm text-muted-foreground">
        Choose a plan to access peptide research, calculators, protocols, and more. Simple monthly access. Cancel anytime.
      </p>
      <Link to="/checkout" className="mt-6 inline-flex btn-blood hover:btn-blood-hover">
        View plans
      </Link>
    </div>
  );
}

function Protocols() {
  const { user } = useAuth();
  const { tier, isAdmin } = useAccess();
  const downloadFn = useServerFn(getProtocolDownloadUrl);
  const [items, setItems] = useState<{ id: string; type: string; title: string; status: string; draft_content: unknown; pdf_storage_path: string | null; coach_notes: string | null; created_at: string; delivered_at: string | null }[]>([]);
  const [intake, setIntake] = useState<{ id: string; status: string; submitted_at: string } | null>(null);

  const canIntake = isAdmin || tier === "full";

  useEffect(() => {
    if (!user) return;
    supabase.from("protocols")
      .select("id, type, title, status, draft_content, pdf_storage_path, coach_notes, created_at, delivered_at")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .order("delivered_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
    supabase.from("intakes").select("id, status, submitted_at").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setIntake(data));
  }, [user]);

  async function download(id: string) {
    try {
      const { url } = await downloadFn({ data: { protocolId: id } });
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  const intakeCta = (
    <div className="border border-foreground/15 bg-muted/30 p-5 sm:p-6">
      <div className="font-display text-xl sm:text-2xl">
        {intake ? "Intake submitted" : "Want a custom protocol?"}
      </div>
      {intake ? (
        <p className="text-sm text-muted-foreground mt-2">
          Status: <span className="font-medium text-foreground">{intake.status}</span> · Submitted {new Date(intake.submitted_at).toLocaleDateString()}. Your coach will deliver your protocol here when ready.
        </p>
      ) : canIntake ? (
        <>
          <p className="text-sm text-muted-foreground mt-2">Fill out your intake and your coach will build a personalized peptide + training plan, delivered right here.</p>
          <Link to="/intake" className="mt-4 inline-flex btn-blood hover:btn-blood-hover">Begin Intake</Link>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mt-2">Custom coaching intakes are a Full Access benefit. Upgrade to unlock a personalized peptide + training protocol built by your coach.</p>
          <Link to="/checkout" className="mt-4 inline-flex btn-blood hover:btn-blood-hover">
            <Lock size={14} /> Upgrade to Full Access
          </Link>
        </>
      )}
    </div>
  );

  if (!items.length) {
    return (
      <div className="space-y-6">
        {intakeCta}
        <Empty title="No protocols yet" body="Once your coach delivers your custom protocol, it'll appear here with a downloadable PDF." />
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {intakeCta}
      {items.map((p) => {
        const draft = p.draft_content as { overview?: string } | null;
        return (
          <article key={p.id} className="border border-foreground/10 p-5 sm:p-6 hover:border-blood transition">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-eyebrow">{p.type}</div>
                <h3 className="font-display text-xl sm:text-2xl mt-1 break-words">{p.title}</h3>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.14em] mt-1">
                  Delivered {p.delivered_at ? new Date(p.delivered_at).toLocaleDateString() : "—"}
                </p>
              </div>
              {p.pdf_storage_path && (
                <button onClick={() => download(p.id)} className="btn-blood hover:btn-blood-hover self-start shrink-0">
                  <Download size={14} /> Download PDF
                </button>
              )}
            </div>
            {draft?.overview && <div className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{draft.overview}</div>}
            {p.coach_notes && (
              <div className="mt-4 border-l-2 border-blood pl-4 text-sm bg-muted p-3">
                <div className="text-eyebrow mb-1">Coach Notes</div>
                {p.coach_notes}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}


type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

function PepTalk() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const isLoading = status === "submitted" || status === "streaming";

  const suggestions = [
    "What does BPC-157 do and how is it typically dosed?",
    "Explain TB-500 stacking with BPC-157.",
    "How should I store peptides after reconstitution?",
    "Best time of day to inject CJC-1295/Ipamorelin?",
  ];

  const submit = async (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    setError(null);
    setInput("");

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: t };
    const assistantId = crypto.randomUUID();
    const next = [...messages, userMsg];
    setMessages([...next, { id: assistantId, role: "assistant", content: "" }]);
    setStatus("submitted");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/pep-talk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (res.status === 403) throw new Error("Full Access required to use Pep Talk.");
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);


      setStatus("streaming");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
        );
      }
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setStatus("error");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    }
  };

  return (
    <div className="border border-foreground/15 bg-card">
      <div className="border-b border-foreground/10 p-5 sm:p-6 flex items-center gap-3">
        <span className="inline-flex items-center justify-center h-8 w-8 bg-blood/10 text-blood">
          <MessageCircle size={16} />
        </span>
        <div>
          <div className="text-eyebrow">AI Assistant</div>
          <h3 className="font-display text-xl sm:text-2xl leading-tight">Pep Talk</h3>
        </div>
      </div>

      <div className="p-4 sm:p-6 min-h-[400px] max-h-[600px] overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ask anything about peptides — effects, dosing, timing, reconstitution, or stacking.
              Answers are for research and educational purposes only.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="text-left text-xs border border-foreground/15 p-3 hover:border-blood hover:text-blood transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-4 py-3 text-sm ${
                  isUser
                    ? "bg-blood text-white"
                    : "border border-foreground/15 bg-background"
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:font-display prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2 prose-strong:text-foreground">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="border border-foreground/15 bg-background px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="border border-blood/40 bg-blood/5 text-sm p-3 text-blood">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-foreground/10 p-3 sm:p-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a peptide, dose, or stack…"
          className="flex-1 bg-background border border-foreground/15 px-3 py-2 text-sm focus:outline-none focus:border-blood"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="btn-blood hover:btn-blood-hover disabled:opacity-50 flex items-center gap-2 px-4"
        >
          <Send size={14} /> <span className="hidden sm:inline">Send</span>
        </button>
      </form>

      <p className="px-4 sm:px-6 pb-4 text-[10px] text-muted-foreground">
        Pep Talk is an AI research assistant, not medical advice. Always consult a qualified physician before use.
      </p>
    </div>
  );
}

function Peptides() {
  return <PeptideLibrary />;
}



function Supplies() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-2xl sm:text-3xl">Research Supplies</h3>
          <p className="text-sm text-muted-foreground mt-2">
            The basics you need to handle peptides safely and accurately in a research setting.
          </p>
        </div>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <Droplets size={18} className="text-blood" />
            <h4 className="font-display text-xl">BAC Water</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Bacteriostatic water is the standard diluent used to reconstitute lyophilized peptide powders. It contains 0.9% benzyl alcohol to inhibit bacterial growth and keep reconstituted solutions stable for research use.
          </p>
        </article>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <Package size={18} className="text-blood" />
            <h4 className="font-display text-xl">1mL Insulin Syringes</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            U-100 1mL insulin syringes let you measure small doses precisely. The fine needle minimizes tissue trauma and is suitable for research administration protocols requiring accuracy down to the unit mark.
          </p>
        </article>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <Package size={18} className="text-blood" />
            <h4 className="font-display text-xl">Alcohol Wipes</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Use alcohol prep pads to sterilize the rubber stopper of every vial before drawing and to clean the research site before administration. This is the simplest way to reduce contamination risk.
          </p>
        </article>
      </div>

      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-2xl sm:text-3xl">Storage Guide</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Proper storage preserves peptide potency and protects your research supply.
          </p>
        </div>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Before Reconstitution</div>
          <h4 className="font-display text-xl mb-2">Lyophilized (Powder) Form</h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Keep vials sealed in their original packaging until use.</li>
            <li>Store in a refrigerator at 2–8°C (36–46°F).</li>
            <li>Protect from direct light, heat, and moisture.</li>
            <li>Avoid repeated temperature swings; a stable cold environment extends shelf life.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">After Reconstitution</div>
          <h4 className="font-display text-xl mb-2">Reconstituted Solution</h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Reconstitute with BAC water and refrigerate immediately at 2–8°C (36–46°F).</li>
            <li>Use within 30 days for best stability in research conditions.</li>
            <li>Do not freeze reconstituted peptides; ice crystals can degrade the compound.</li>
            <li>Keep vials away from direct light and heat sources.</li>
            <li>Swab the vial stopper with an alcohol wipe before each draw.</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
function Reconstitution() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-2xl sm:text-3xl">Reconstitution</h3>
          <p className="text-sm text-muted-foreground mt-2">
            How to mix lyophilized peptide powder with bacteriostatic (BAC) water for research use.
          </p>
        </div>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step 1 — Prepare</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Wash your hands thoroughly.</li>
            <li>Clean the work surface and lay out the vial, BAC water, syringe, and alcohol wipes.</li>
            <li>Let the peptide vial reach room temperature before reconstituting.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step 2 — Add BAC Water</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Wipe the rubber stopper of the peptide vial with an alcohol wipe.</li>
            <li>Draw the desired amount of BAC water into the syringe.</li>
            <li>Slowly inject the BAC water down the inside wall of the vial — not directly onto the powder.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step 3 — Dissolve Gently</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Roll the vial slowly between your hands until the powder is completely dissolved.</li>
            <li className="text-blood font-medium">DO NOT SHAKE the vials — shaking can damage the peptide structure.</li>
            <li>Do not stir or agitate the solution.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step 4 — Store</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Refrigerate immediately after reconstitution at 2–8°C (36–46°F).</li>
            <li>Use within 30 days for best research stability.</li>
            <li>Keep away from light, heat, and freezing temperatures.</li>
          </ul>
        </article>
      </div>

      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-2xl sm:text-3xl">Important Tips</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Small habits make a big difference in peptide stability and accuracy.
          </p>
        </div>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <FlaskConical size={18} className="text-blood" />
            <h4 className="font-display text-xl">Be Patient</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Some peptides dissolve slowly. Gentle rolling over a few minutes is better than any forceful mixing.
          </p>
        </article>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <FlaskConical size={18} className="text-blood" />
            <h4 className="font-display text-xl">Use the Right Water</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Only use bacteriostatic water for reconstitution. Standard sterile water lacks the preservative needed for multi-use research vials.
          </p>
        </article>
        <article className="border border-foreground/10 p-5 hover:border-blood transition">
          <div className="flex items-center gap-3">
            <FlaskConical size={18} className="text-blood" />
            <h4 className="font-display text-xl">Don't Freeze After Mixing</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Freezing a reconstituted solution can degrade the peptide. Keep it refrigerated and stable until use.
          </p>
        </article>
      </div>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-foreground/20 p-12 text-center">
      <div className="font-display text-2xl sm:text-3xl">{title}</div>
      <p className="text-sm text-muted-foreground mt-2">{body}</p>
    </div>
  );
}

function Injection() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-2xl sm:text-3xl">Injection Guide</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Most research peptides are delivered subcutaneously (into the fat layer just under the skin) using a 1mL insulin syringe.
          </p>
        </div>
        <figure className="border border-foreground/10 p-3 bg-foreground/5">
          <img
            src={injectionSitesAsset.url}
            alt="Diagram of recommended subcutaneous injection sites on the body"
            className="w-full h-auto"
            loading="lazy"
          />
          <figcaption className="text-eyebrow mt-3 text-center">Common Subcutaneous Injection Sites</figcaption>
        </figure>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Recommended Sites</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Abdomen — at least 2 inches away from the navel.</li>
            <li>Love handles / flanks — easy to pinch, minimal discomfort.</li>
            <li>Outer thighs — front and side, avoiding muscle.</li>
            <li>Back of upper arm (with assistance).</li>
          </ul>
        </article>
      </div>

      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="font-display text-2xl sm:text-3xl">Injection Best Practices</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Consistency, cleanliness, and rotation are the foundation of safe subcutaneous injections.
          </p>
        </div>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Step-by-Step</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Wash your hands and wipe the injection site with an alcohol swab.</li>
            <li>Wipe the vial's rubber stopper and draw your dose slowly into the insulin syringe.</li>
            <li>Tap out air bubbles and push the plunger until a small bead forms at the tip.</li>
            <li>Pinch a fold of skin, insert the needle at a 45–90° angle in one quick motion.</li>
            <li>Depress the plunger slowly and steadily.</li>
            <li>Withdraw the needle at the same angle and apply light pressure with a clean wipe.</li>
            <li>Safely dispose of the needle in a sharps container — never re-use.</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Rotate Sites</div>
          <p className="text-sm text-muted-foreground">
            Rotate injection sites daily to prevent scar tissue, lipohypertrophy (fatty lumps), and bruising. Keep at least a 1-inch gap between injections.
          </p>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Avoid</div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Veins, moles, scars, stretch marks, and bruised or irritated skin.</li>
            <li>Injecting into muscle — subcutaneous means the fat layer only.</li>
            <li>Re-using needles — they dull quickly and increase infection risk.</li>
          </ul>
        </article>
        <article className="border border-blood/40 bg-blood/5 p-5">
          <div className="text-eyebrow mb-2 text-blood">When to Stop</div>
          <p className="text-sm text-muted-foreground">
            Persistent redness, swelling, warmth, fever, or an unusual reaction at the site warrants stopping and seeking medical guidance.
          </p>
        </article>
      </div>
    </div>
  );
}

function Lifting() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-2xl sm:text-3xl">Weight Lifting Tips</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Training splits, compound lifts, and nutrition targets to maximize strength and body composition.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="mb-2">
            <h4 className="font-display text-xl sm:text-2xl">Best Training Splits</h4>
            <p className="text-sm text-muted-foreground mt-2">Pick a split that matches your schedule, recovery, and experience level.</p>
          </div>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="text-eyebrow mb-1">Push / Pull / Legs</div>
            <p className="text-sm text-muted-foreground">Push (chest, shoulders, triceps), Pull (back, biceps), Legs. Run 3 or 6 days per week. Great for volume and recovery.</p>
          </article>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="text-eyebrow mb-1">Upper / Lower</div>
            <p className="text-sm text-muted-foreground">Upper body one day, lower body the next. Repeat 4 days per week. Balanced frequency for strength and hypertrophy.</p>
          </article>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="text-eyebrow mb-1">Full Body</div>
            <p className="text-sm text-muted-foreground">Compound movements every session. Ideal for beginners or limited schedules — 3 days per week is enough.</p>
          </article>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="text-eyebrow mb-1">Bro Split</div>
            <p className="text-sm text-muted-foreground">One muscle group per day (chest day, back day, etc.). Lower frequency but high volume per session. Better for advanced lifters.</p>
          </article>
        </div>

        <div className="space-y-4">
          <div className="mb-2">
            <h4 className="font-display text-xl sm:text-2xl">Popular Lifts</h4>
            <p className="text-sm text-muted-foreground mt-2">Master these compound movements to build strength and size.</p>
          </div>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="flex items-center gap-3">
              <Dumbbell size={18} className="text-blood" />
              <h4 className="font-display text-xl">Squat</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-2">The king of lower-body strength. Hits quads, glutes, hamstrings, and core.</p>
          </article>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="flex items-center gap-3">
              <Dumbbell size={18} className="text-blood" />
              <h4 className="font-display text-xl">Deadlift</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Develops total-body power, grip, posterior chain, and back thickness.</p>
          </article>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="flex items-center gap-3">
              <Dumbbell size={18} className="text-blood" />
              <h4 className="font-display text-xl">Bench Press</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Primary pressing strength for chest, anterior delts, and triceps.</p>
          </article>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="flex items-center gap-3">
              <Dumbbell size={18} className="text-blood" />
              <h4 className="font-display text-xl">Overhead Press</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Builds shoulder size, triceps, and upper-body stability.</p>
          </article>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="flex items-center gap-3">
              <Dumbbell size={18} className="text-blood" />
              <h4 className="font-display text-xl">Barbell Row</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Adds back thickness, grip strength, and pulling power.</p>
          </article>
          <article className="border border-foreground/10 p-5 hover:border-blood transition">
            <div className="flex items-center gap-3">
              <Dumbbell size={18} className="text-blood" />
              <h4 className="font-display text-xl">Pull-Up</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Bodyweight back and biceps builder that scales with added weight.</p>
          </article>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Bulking</div>
          <h4 className="font-display text-xl mb-2">Caloric Surplus</h4>
          <p className="text-sm text-muted-foreground">Eat 10–20% above maintenance calories. Prioritize protein and carbs to fuel training and muscle growth.</p>
          <ul className="text-sm text-muted-foreground mt-3 space-y-1 list-disc list-inside">
            <li>Protein: 0.7–1g per lb bodyweight</li>
            <li>Carbs: 2–4g per lb bodyweight</li>
            <li>Fats: 0.3–0.5g per lb bodyweight</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Cutting</div>
          <h4 className="font-display text-xl mb-2">Caloric Deficit</h4>
          <p className="text-sm text-muted-foreground">Eat 10–25% below maintenance. Keep protein high to preserve muscle while losing fat.</p>
          <ul className="text-sm text-muted-foreground mt-3 space-y-1 list-disc list-inside">
            <li>Protein: 1–1.2g per lb bodyweight</li>
            <li>Carbs: 1–2g per lb bodyweight</li>
            <li>Fats: 0.25–0.4g per lb bodyweight</li>
          </ul>
        </article>
        <article className="border border-foreground/10 p-5">
          <div className="text-eyebrow mb-2">Maintenance</div>
          <h4 className="font-display text-xl mb-2">Body Recomposition</h4>
          <p className="text-sm text-muted-foreground">Eat at estimated maintenance. Progress comes from training quality and recovery.</p>
          <ul className="text-sm text-muted-foreground mt-3 space-y-1 list-disc list-inside">
            <li>Protein: 0.8–1g per lb bodyweight</li>
            <li>Carbs: 2–3g per lb bodyweight</li>
            <li>Fats: 0.3–0.5g per lb bodyweight</li>
          </ul>
        </article>
      </div>
    </div>
  );
}

function PeptideCalculator() {
  const [strength, setStrength] = useState<string>("5");
  const [strengthUnit, setStrengthUnit] = useState<"mg" | "mcg">("mg");
  const [dose, setDose] = useState<string>("250");
  const [doseUnit, setDoseUnit] = useState<"mcg" | "mg">("mcg");
  const [bac, setBac] = useState<string>("2");

  const strengthMg = (parseFloat(strength) || 0) * (strengthUnit === "mg" ? 1 : 0.001);
  const doseMg = (parseFloat(dose) || 0) * (doseUnit === "mg" ? 1 : 0.001);
  const bacMl = parseFloat(bac) || 0;

  const concentration = bacMl > 0 ? strengthMg / bacMl : 0; // mg per mL
  const volumeMl = concentration > 0 ? doseMg / concentration : 0;
  const units = volumeMl * 100; // 100 unit = 1 mL syringe
  const valid = strengthMg > 0 && doseMg > 0 && bacMl > 0 && units > 0 && units <= 100;
  const overfill = units > 100;

  // Syringe visualization dimensions
  const barrelWidth = 320;
  const clampedUnits = Math.max(0, Math.min(100, units));
  const fillWidth = (clampedUnits / 100) * barrelWidth;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="border border-foreground/15 bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Peptide Dose Calculator</h2>
        <p className="text-sm text-muted-foreground mt-2">
          For research reference only. Verify all calculations independently before use.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-eyebrow block mb-2">Vial Strength</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="flex-1 border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
                placeholder="5"
              />
              <select
                value={strengthUnit}
                onChange={(e) => setStrengthUnit(e.target.value as "mg" | "mcg")}
                className="border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total peptide contained in the vial.</p>
          </div>

          <div>
            <label className="text-eyebrow block mb-2">Desired Dose</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                className="flex-1 border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
                placeholder="250"
              />
              <select
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as "mcg" | "mg")}
                className="border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Works with decimal doses like 1.5 mg or 2.5 mcg.</p>
          </div>

          <div>
            <label className="text-eyebrow block mb-2">BAC Water Added (mL)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={bac}
              onChange={(e) => setBac(e.target.value)}
              className="w-full border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
              placeholder="2"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setBac(String(v))}
                  className="border border-foreground/20 px-2 py-1 font-mono text-[10px] uppercase tracking-widest hover:border-blood hover:text-blood"
                >
                  {v} mL
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-foreground/15 bg-card p-5 sm:p-6">
        <h3 className="font-display text-xl">Draw To</h3>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Units" value={valid ? units.toFixed(1) : "—"} accent />
          <Stat label="Volume" value={valid ? `${volumeMl.toFixed(3)} mL` : "—"} />
          <Stat label="Concentration" value={concentration > 0 ? `${concentration.toFixed(2)} mg/mL` : "—"} />
        </div>

        {overfill && (
          <div className="mt-4 border border-blood bg-blood/10 p-3 text-sm text-blood">
            Dose exceeds a single 1 mL / 100-unit syringe. Reduce dose, split injection, or use more BAC water.
          </div>
        )}

        <div className="mt-6">
          <div className="text-eyebrow mb-3">1 mL / 100 Unit Syringe</div>
          <svg viewBox="0 -6 440 96" className="w-full h-auto">
            {/* Plunger */}
            <rect x="0" y="30" width="20" height="30" fill="var(--color-foreground)" opacity="0.7" />
            <rect x="20" y="35" width="10" height="20" fill="var(--color-foreground)" opacity="0.5" />
            {/* Barrel */}
            <rect x="30" y="20" width={barrelWidth} height="50" fill="none" stroke="var(--color-foreground)" strokeWidth="1.5" />
            {/* Fill (dose) */}
            <rect x={30 + barrelWidth - fillWidth} y="22" width={fillWidth} height="46" fill="var(--color-blood)" opacity="0.85" />
            {/* Graduations: every 1 unit, longer every 5, numbered every 10 (as on a real U-100 syringe) */}
            {Array.from({ length: 101 }).map((_, i) => {
              const major = i % 10 === 0;
              const mid = i % 5 === 0;
              const x = 30 + (i / 100) * barrelWidth;
              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1="20"
                    x2={x}
                    y2={major ? 8 : mid ? 12 : 15}
                    stroke="var(--color-foreground)"
                    strokeWidth={major ? 1.2 : 0.6}
                    opacity={major ? 1 : mid ? 0.8 : 0.55}
                  />
                  {major && (
                    <text
                      x={x}
                      y="5"
                      fontSize="6"
                      textAnchor="middle"
                      fill="var(--color-foreground)"
                      fontFamily="monospace"
                    >
                      {100 - i}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Needle hub */}
            <rect x={30 + barrelWidth} y="35" width="14" height="20" fill="var(--color-foreground)" opacity="0.7" />
            {/* Needle */}
            <rect x={30 + barrelWidth + 14} y="43" width="60" height="4" fill="var(--color-foreground)" />
          </svg>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>100 U</span>
            <span className="text-blood">Fill to {valid ? units.toFixed(1) : "—"} U</span>
            <span>0 U</span>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Formula: concentration = vial strength ÷ BAC water. Volume = dose ÷ concentration. Units = volume × 100 (on a 1 mL / 100 U insulin syringe).
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-foreground/10 p-3">
      <div className="text-eyebrow">{label}</div>
      <div className={`font-display text-xl sm:text-2xl mt-1 ${accent ? "text-blood" : ""}`}>{value}</div>
    </div>
  );
}

type StackItem = {
  id: string;
  name: string;
  dose: string | null;
  unit: string | null;
  frequency: string | null;
  schedule: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  time_slots: string[] | null;
  days_of_week: number[] | null;
};

type StackFormState = {
  name: string;
  dose: string;
  unit: string;
  frequency: string;
  schedule: string;
  notes: string;
  active: boolean;
  time_slots: Slot[];
  days_of_week: number[];
};

const EMPTY_STACK_FORM: StackFormState = { name: "", dose: "", unit: "mcg", frequency: "", schedule: "", notes: "", active: true, time_slots: ["morning"], days_of_week: [0, 1, 2, 3, 4, 5, 6] };

function MyStack() {
  const { user } = useAuth();
  const [items, setItems] = useState<StackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StackItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StackFormState>(EMPTY_STACK_FORM);
  const [saving, setSaving] = useState(false);
  const [slotsTouched, setSlotsTouched] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("peptide_stacks")
      .select("id, name, dose, unit, frequency, schedule, notes, active, created_at, time_slots, days_of_week")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as StackItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_STACK_FORM);
    setSlotsTouched(false);
    setShowForm(true);
  }

  function openEdit(item: StackItem) {
    setEditing(item);
    setForm({
      name: item.name,
      dose: item.dose ?? "",
      unit: item.unit ?? "",
      frequency: item.frequency ?? "",
      schedule: item.schedule ?? "",
      notes: item.notes ?? "",
      active: item.active,
      time_slots: (item.time_slots?.length ? item.time_slots : ["morning"]) as Slot[],
      days_of_week: item.days_of_week?.length ? item.days_of_week : [0, 1, 2, 3, 4, 5, 6],
    });
    setSlotsTouched(true);
    setShowForm(true);
  }

  /** Keep the tracker schedule in sync with what the client types, until they edit it manually. */
  function updateTiming(next: { frequency?: string; schedule?: string }) {
    setForm((prev) => {
      const merged = { ...prev, ...next };
      if (slotsTouched) return merged;
      const guess = inferSchedule(merged.frequency, merged.schedule);
      return { ...merged, time_slots: guess.slots, days_of_week: guess.days };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) { toast.error("Peptide name is required"); return; }
    if (form.time_slots.length === 0) { toast.error("Pick at least one time of day"); return; }
    if (form.days_of_week.length === 0) { toast.error("Pick at least one day"); return; }
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      dose: form.dose.trim() || null,
      unit: form.unit.trim() || null,
      frequency: form.frequency.trim() || null,
      schedule: form.schedule.trim() || null,
      notes: form.notes.trim() || null,
      active: form.active,
      time_slots: form.time_slots,
      days_of_week: form.days_of_week,
    };
    const { error } = editing
      ? await supabase.from("peptide_stacks").update(payload).eq("id", editing.id)
      : await supabase.from("peptide_stacks").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Added to your stack");
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_STACK_FORM);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this peptide from your stack?")) return;
    const { error } = await supabase.from("peptide_stacks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function toggleActive(item: StackItem) {
    const { error } = await supabase.from("peptide_stacks").update({ active: !item.active }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: !i.active } : i)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-eyebrow">Dosing & Stacks</div>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl">My Stack</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Track the peptides you're running, your doses, and your schedule. Anything you add here lands on your daily
            tracker automatically — just tap to mark each injection done.
          </p>
        </div>
        {!showForm && (
          <button onClick={openNew} className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2">
            <Plus size={16} /> Add Peptide
          </button>
        )}
      </div>

      {!loading && <DoseTracker items={items} />}

      {showForm && (
        <form onSubmit={save} className="border border-foreground/15 bg-foreground/[0.02] p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg sm:text-xl">{editing ? "Edit peptide" : "New peptide"}</div>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Peptide *">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BPC-157" className="stack-input" />
            </Field>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label="Dose">
                <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="e.g. 250" className="stack-input" />
              </Field>
              <Field label="Unit">
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="stack-input">
                  <option value="mcg">mcg</option>
                  <option value="mg">mg</option>
                  <option value="iu">IU</option>
                  <option value="units">units</option>
                </select>
              </Field>
            </div>
            <Field label="Frequency">
              <input value={form.frequency} onChange={(e) => updateTiming({ frequency: e.target.value })} placeholder="e.g. 2x daily" className="stack-input" />
            </Field>
            <Field label="When / Schedule">
              <input value={form.schedule} onChange={(e) => updateTiming({ schedule: e.target.value })} placeholder="e.g. AM & PM, Mon–Fri" className="stack-input" />
            </Field>
          </div>

          <div className="border border-foreground/10 p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-eyebrow">Daily tracker schedule</div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {slotsTouched ? "Manual" : "Auto-filled from what you typed"}
              </span>
            </div>
            <div>
              <div className="mb-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Time of day</div>
              <div className="flex flex-wrap gap-2">
                {SLOTS.map(({ key, label, icon: Icon }) => {
                  const on = form.time_slots.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSlotsTouched(true);
                        setForm((p) => ({ ...p, time_slots: on ? p.time_slots.filter((s) => s !== key) : [...p.time_slots, key] }));
                      }}
                      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs transition ${on ? "border-blood text-blood bg-blood/10" : "border-foreground/15 text-muted-foreground hover:text-foreground"}`}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Days</div>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((d, i) => {
                  const on = form.days_of_week.includes(i);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setSlotsTouched(true);
                        setForm((p) => ({ ...p, days_of_week: on ? p.days_of_week.filter((x) => x !== i) : [...p.days_of_week, i].sort((a, b) => a - b) }));
                      }}
                      className={`w-11 border py-1.5 text-[11px] transition ${on ? "border-blood text-blood bg-blood/10" : "border-foreground/15 text-muted-foreground hover:text-foreground"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <button type="button" onClick={() => { setSlotsTouched(true); setForm((p) => ({ ...p, days_of_week: [0, 1, 2, 3, 4, 5, 6] })); }} className="hover:text-blood">Every day</button>
                <button type="button" onClick={() => { setSlotsTouched(true); setForm((p) => ({ ...p, days_of_week: [1, 2, 3, 4, 5] })); }} className="hover:text-blood">Weekdays</button>
                <button type="button" onClick={() => { setSlotsTouched(true); setForm((p) => ({ ...p, days_of_week: [1, 3, 5] })); }} className="hover:text-blood">Mon/Wed/Fri</button>
                <button type="button" onClick={() => { setSlotsTouched(true); setForm((p) => ({ ...p, days_of_week: [1] })); }} className="hover:text-blood">Weekly</button>
              </div>
            </div>
          </div>

          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Cycle length, stack context, how you're feeling…" className="stack-input" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Currently running
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />} {editing ? "Save changes" : "Add to stack"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading your stack…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-foreground/20 p-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Add your first peptide to start tracking your dosing and stacks.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className={`border p-4 ${item.active ? "border-blood/40" : "border-foreground/10 opacity-70"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-lg sm:text-xl truncate">{item.name}</div>
                  <div className="mt-1 text-sm text-blood font-medium">
                    {item.dose ? `${item.dose} ${item.unit ?? ""}`.trim() : "No dose set"}
                    {item.frequency ? ` · ${item.frequency}` : ""}
                  </div>
                  {item.schedule && <div className="mt-1 text-xs text-muted-foreground">{item.schedule}</div>}
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {(item.time_slots?.length ? item.time_slots : ["morning"]).map((s) => s[0]!.toUpperCase() + s.slice(1)).join(" · ")}
                    {" — "}
                    {(item.days_of_week?.length ?? 7) === 7 ? "every day" : (item.days_of_week ?? []).map((d) => DAY_LABELS[d]).join(", ")}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openEdit(item)} title="Edit" className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                  <button onClick={() => remove(item.id)} title="Delete" className="p-1.5 text-muted-foreground hover:text-blood"><Trash2 size={14} /></button>
                </div>
              </div>
              {item.notes && <p className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap">{item.notes}</p>}
              <button
                onClick={() => toggleActive(item)}
                className={`mt-3 font-mono text-[10px] uppercase tracking-[0.18em] ${item.active ? "text-blood" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.active ? "● Active" : "○ Paused"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Combos() {
  const combos = [
    {
      name: "BPC-157 + TB-500",
      tag: "Recovery & Tissue Repair",
      pathways: "Both are studied for soft-tissue, tendon, ligament, and gut-lining repair. BPC-157 is researched for angiogenesis and growth-factor upregulation; TB-500 (Thymosin β4) is studied for cell migration, actin regulation, and inflammation modulation.",
      overlap: "Overlapping interest in wound healing, vascular growth, and reducing local inflammation — which is why they're frequently discussed together in recovery-focused research.",
      questions: "Is the goal acute injury recovery or general connective-tissue support? How long is the intended research window? Are you tracking one variable at a time so you can tell which compound is doing what?"
    },
    {
      name: "Ipamorelin + CJC-1295 (No DAC)",
      tag: "GH Secretagogue Stack",
      pathways: "Ipamorelin is a selective ghrelin-receptor agonist; CJC-1295 (No DAC) is a GHRH analog. Different receptors, same downstream target: pulsatile GH release from the pituitary.",
      overlap: "Synergistic pulse amplification — GHRH primes the pituitary while a GHRP triggers release. This is why the two are almost always studied together rather than alone.",
      questions: "Are pulses timed away from meals and around sleep to mirror natural GH rhythm? Is IGF-1 being monitored? Is the DAC vs. no-DAC choice appropriate for the research goal (pulsatile vs. sustained elevation)?"
    },
    {
      name: "Semaglutide + Tirzepatide (sequential, not combined)",
      tag: "GLP-1 Class Transition",
      pathways: "Semaglutide is a GLP-1 receptor agonist. Tirzepatide is a dual GIP/GLP-1 agonist. Both act on incretin pathways affecting satiety, gastric emptying, and glucose handling.",
      overlap: "Heavy mechanistic overlap on the GLP-1 axis — which is exactly why stacking them simultaneously is not something the research supports. They are typically discussed as a transition (one to the other), not a combination.",
      questions: "Is this a transition or an actual stack? What's the washout consideration? How are GI side effects and lean-mass loss being tracked? Is there a muscle-preservation strategy in place?"
    },
    {
      name: "Retatrutide + Muscle-Preservation Peptides",
      tag: "Body Composition Research",
      pathways: "Retatrutide is a triple agonist (GLP-1 / GIP / glucagon). Aggressive fat loss on triple agonists raises concerns about lean-mass loss, which is why muscle-preservation compounds are studied alongside it.",
      overlap: "The overlap isn't mechanistic — it's strategic. One arm drives fat loss; the other arm targets the muscle-preservation gap that arm creates.",
      questions: "Is protein intake and resistance training the actual foundation, with peptides layered on top? Is body composition being measured (DEXA, tape, photos) rather than just scale weight?"
    },
    {
      name: "GHK-Cu + BPC-157",
      tag: "Skin, Hair & Tissue",
      pathways: "GHK-Cu is a copper peptide studied for extracellular matrix remodeling, collagen synthesis, and antioxidant activity. BPC-157 is studied for systemic tissue repair and angiogenesis.",
      overlap: "Both touch collagen, wound healing, and tissue remodeling — but through different mechanisms, which is why they're often discussed as complementary rather than redundant.",
      questions: "Is the research goal topical (skin/hair) or systemic (injury recovery)? Different delivery methods matter. Is copper status being considered with GHK-Cu?"
    },
    {
      name: "Tesamorelin + Ipamorelin",
      tag: "Advanced GH Axis",
      pathways: "Tesamorelin is a stabilized GHRH analog with strong research on visceral fat reduction. Ipamorelin is a selective GHRP that triggers a clean GH pulse without significantly affecting cortisol or prolactin.",
      overlap: "Same GHRH + GHRP logic as CJC/Ipamorelin, but Tesamorelin brings a distinct body-composition profile that CJC does not.",
      questions: "Is Tesamorelin the right choice over CJC for this specific research goal? Is IGF-1 being monitored? Is insulin sensitivity being tracked?"
    },
    {
      name: "NAD+ + Glutathione",
      tag: "Cellular & Longevity Research",
      pathways: "NAD+ is central to mitochondrial function, sirtuin activity, and cellular energy. Glutathione is the body's primary intracellular antioxidant, tied to oxidative-stress regulation and detox pathways.",
      overlap: "Both sit in the metabolic-health / longevity research space and are frequently discussed together, though their mechanisms are distinct rather than overlapping.",
      questions: "Is baseline energy, sleep, and recovery being tracked? Is delivery route appropriate for the compound? Are you isolating variables long enough to know what's actually working?"
    },
    {
      name: "Melanotan II + PT-141",
      tag: "MC Receptor Family",
      pathways: "Both act on melanocortin receptors. MT-II is a broad MC agonist studied for pigmentation and appetite effects; PT-141 (Bremelanotide) is a more selective MC4R agonist studied for sexual response.",
      overlap: "Same receptor family, different selectivity profiles. Effects can compound in ways that aren't always desirable, which is why they're rarely studied simultaneously.",
      questions: "Is there a reason to combine rather than choose one? How is blood pressure being monitored? Are side-effect profiles (nausea, flushing, pigmentation) acceptable for the research context?"
    },
    {
      name: "Follistatin + Myostatin Inhibitors",
      tag: "Muscle Growth Pathway",
      pathways: "Follistatin binds and inhibits myostatin, a negative regulator of muscle growth. Other myostatin-pathway compounds target the same axis from different angles (ActRII, activin).",
      overlap: "Direct pathway overlap. Combining agents that all suppress the same negative regulator raises questions about magnitude, safety, and off-target effects on other TGF-β family signaling.",
      questions: "What does the actual research on combined pathway suppression show? Is this pathway one you should be aggressively suppressing at all? Is there long-term safety data to justify the strategy?"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow">Research & Education</div>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl">Peptide Combinations</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Compounds that are commonly researched together — including where their mechanisms overlap and what to think through before considering a combination.
          For educational purposes only. Not medical advice.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {combos.map((c) => (
          <article key={c.name} className="border border-foreground/15 p-5 sm:p-6 hover:border-blood transition flex flex-col">
            <div className="flex items-center gap-2 text-blood mb-3">
              <BookOpen size={18} />
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em]">{c.tag}</span>
            </div>
            <h3 className="font-display text-lg sm:text-xl leading-tight">{c.name}</h3>
            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <div>
                <div className="text-eyebrow mb-1">Similar pathways</div>
                <p className="text-muted-foreground">{c.pathways}</p>
              </div>
              <div>
                <div className="text-eyebrow mb-1">Overlapping mechanisms</div>
                <p className="text-muted-foreground">{c.overlap}</p>
              </div>
              <div>
                <div className="text-eyebrow mb-1">Questions to consider</div>
                <p className="text-muted-foreground">{c.questions}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="border border-blood/40 bg-blood/5 p-5 text-sm text-muted-foreground">
        <span className="text-blood font-mono uppercase tracking-[0.14em] text-xs">Reminder</span>
        <p className="mt-2">This information is educational. It is not a recommendation to combine any compounds. Combinations multiply variables, side-effect risk, and unknowns — always research each compound individually first and consult a qualified professional.</p>
      </div>
    </div>
  );
}

function Learning() {
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<Record<string, boolean>>({});

  const courses = [
    {
      id: "peptides-101",
      title: "Peptides 101",
      tag: "Foundations",
      summary: "Start here. What peptides actually are, how they differ from steroids and hormones, and how researchers think about them.",
      lessons: [
        {
          title: "What is a peptide?",
          body: "A peptide is a short chain of amino acids — the same building blocks that make up proteins, just in smaller sequences. Because they're small and specific, peptides can signal targeted actions in the body, like triggering hormone release, aiding tissue repair, or influencing metabolism. This targeted signaling is what makes them so interesting in research."
        },
        {
          title: "Peptides vs. steroids vs. hormones",
          body: "Steroids are lipid-based molecules that flood systemic pathways. Hormones can be either peptide- or steroid-based and act as long-range messengers. Research peptides typically act more like precise signals — they tell the body to do something it already knows how to do (release GH, repair tissue, regulate appetite) rather than overriding a system entirely."
        },
        {
          title: "How peptides are typically studied",
          body: "Most research peptides are reconstituted with bacteriostatic water and administered subcutaneously with an insulin syringe. Dosing is measured in micrograms (mcg) or milligrams (mg), and timing often matters as much as dose — pulsatile compounds like GH secretagogues are studied around sleep and away from meals."
        },
        {
          title: "Quality, sourcing, and safety",
          body: "Purity matters more than price. Reputable suppliers provide certificates of analysis (COAs) verifying identity and purity. Storage matters too — most peptides need refrigeration after reconstitution and have a limited shelf life. Cutting corners on sourcing is the single biggest risk factor in this space."
        }
      ]
    },
    {
      id: "muscle-growth",
      title: "Muscle Growth Science",
      tag: "Hypertrophy",
      summary: "The three drivers of hypertrophy, how satellite cells and mTOR fit in, and what actually determines whether you grow.",
      lessons: [
        {
          title: "The three drivers of hypertrophy",
          body: "Mechanical tension is the primary driver — heavy loads through a full range of motion. Metabolic stress (the pump, higher-rep work) and muscle damage play smaller supporting roles. If you had to prioritize one variable, it's progressive overload on compound lifts through complete ranges of motion."
        },
        {
          title: "Protein synthesis and mTOR",
          body: "Training triggers muscle protein synthesis (MPS) via the mTOR pathway. MPS stays elevated for roughly 24–48 hours after a hard session. Leucine (found in complete proteins) is the primary amino acid that flips the mTOR switch — which is why per-meal protein quality matters, not just daily totals."
        },
        {
          title: "Satellite cells and the growth ceiling",
          body: "Satellite cells donate nuclei to muscle fibers, raising the ceiling on how much a fiber can grow. This is part of why consistent training over years compounds — you're not just growing existing tissue, you're expanding the infrastructure that allows more growth later."
        },
        {
          title: "Volume, frequency, and recovery",
          body: "Most trained lifters grow best with 10–20 hard sets per muscle group per week, split across 2 sessions. Recovery isn't optional — it's when the actual adaptation happens. Sleep, protein, and managed stress do more for hypertrophy than any single training tweak."
        }
      ]
    },
    {
      id: "fat-loss",
      title: "Fat Loss Fundamentals",
      tag: "Body Composition",
      summary: "Energy balance, why the scale lies, protecting muscle in a deficit, and how to structure a sustainable cut.",
      lessons: [
        {
          title: "Energy balance is the foundation",
          body: "Fat loss requires a sustained calorie deficit — no peptide, supplement, or training style bypasses this. Everything else (macros, timing, training style) determines the quality of the fat loss: how much comes from fat vs. muscle, how you feel, and whether you can sustain it."
        },
        {
          title: "Why the scale lies",
          body: "Scale weight reflects fat, muscle, water, glycogen, and gut contents. Sodium, carbs, hormones, and stress can swing daily weight by 3–5 lbs with no actual change in fat. Track weekly averages and use tape measurements or photos alongside — trends over 3–4 weeks tell the real story."
        },
        {
          title: "Protecting muscle in a deficit",
          body: "In a deficit, three things preserve muscle: (1) high protein intake — around 1g per lb of goal bodyweight, (2) heavy resistance training with maintained or slightly reduced volume, (3) a reasonable deficit — aggressive cuts (>1% bodyweight/week for long periods) accelerate muscle loss."
        },
        {
          title: "Structuring a sustainable cut",
          body: "Start with a 15–20% deficit. Recalculate every 3–4 weeks as bodyweight drops. Take planned diet breaks (a week at maintenance) every 6–10 weeks to restore hormones and adherence. End the cut before you're miserable — dragging a deficit past its useful life is where most people lose muscle and regain fat."
        }
      ]
    },
    {
      id: "recovery",
      title: "Recovery Optimization",
      tag: "Adaptation",
      summary: "Sleep architecture, autonomic recovery, deloads, and how to tell over-reaching from actual overtraining.",
      lessons: [
        {
          title: "Sleep is the primary recovery tool",
          body: "Deep sleep is when GH pulses hardest, memory consolidates, and tissue repair peaks. Most adults need 7–9 hours. Consistent sleep and wake times, a cool dark room, and cutting screens/caffeine late in the day outperform almost any supplement stack you could build for recovery."
        },
        {
          title: "Nervous system recovery vs. muscle recovery",
          body: "Muscles can feel fine while your nervous system is fried. Signs of autonomic under-recovery: elevated resting heart rate, poor HRV, disrupted sleep, low motivation, plateaued lifts despite feeling 'fresh.' This is what actually forces most people into deloads — not soreness."
        },
        {
          title: "Deloads and planned recovery",
          body: "A deload — 40–60% of normal volume for a week — every 4–8 weeks lets fatigue drop while fitness stays. Programmed deloads prevent forced ones. If you've never deloaded and feel constantly beat up, that's usually the missing piece."
        },
        {
          title: "Overreaching vs. overtraining",
          body: "Functional overreaching is a short intentional overload followed by a deload — you come back stronger. Non-functional overreaching (weeks of accumulated fatigue) blunts progress. True overtraining (months of decline, HPA dysfunction) is rare in gen-pop but real. If performance drops week over week despite reduced load, back off."
        }
      ]
    },
    {
      id: "nutrition",
      title: "Nutrition Basics",
      tag: "Fueling",
      summary: "Macros, meal timing, hydration, and how to build a diet you'll actually stick to.",
      lessons: [
        {
          title: "Protein: the non-negotiable",
          body: "Aim for roughly 0.8–1g of protein per lb of bodyweight, spread across 3–5 meals. Complete protein sources (meat, fish, eggs, dairy, whey) hit leucine thresholds most efficiently. If you get protein right, most other diet decisions become much more forgiving."
        },
        {
          title: "Carbs and fats — pick your fuel mix",
          body: "Once protein is set, the split between carbs and fats is mostly preference and performance. Higher carbs generally support hard training and recovery. Higher fats support satiety and hormone production. Neither is 'better' — they're levers you tune to how you eat and train."
        },
        {
          title: "Meal timing (and when it actually matters)",
          body: "For most goals, total daily intake matters far more than meal timing. That said: protein spread across the day (every 3–5 hours) optimizes MPS, and carbs around training support performance and recovery. Beyond that, eat on a schedule that fits your life."
        },
        {
          title: "Hydration, micros, and consistency",
          body: "Aim for pale-yellow urine as a rough hydration target — usually 0.5–1 oz of water per lb of bodyweight daily. Get most micronutrients from whole foods; supplement only what's actually low. The best diet is the one you can run for years — not the one that looks best on paper for six weeks."
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow">Learning Center</div>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl">Mini Courses</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Short, focused lessons on the foundations. Each course is broken into a handful of quick reads — tap to expand.
          For educational purposes only.
        </p>
      </div>

      <div className="space-y-3">
        {courses.map((c) => {
          const isOpen = openCourse === c.id;
          return (
            <div key={c.id} className="border border-foreground/15">
              <button
                type="button"
                onClick={() => setOpenCourse(isOpen ? null : c.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:border-blood transition"
              >
                <div className="text-blood shrink-0"><GraduationCap size={22} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-blood">{c.tag} · {c.lessons.length} lessons</div>
                  <h3 className="mt-1 font-display text-lg sm:text-xl leading-tight">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.summary}</p>
                </div>
                <ChevronDown size={18} className={`shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-foreground/10 divide-y divide-foreground/10">
                  {c.lessons.map((l, idx) => {
                    const key = `${c.id}:${idx}`;
                    const lessonOpen = openLesson[key];
                    return (
                      <div key={key} className="p-5">
                        <button
                          type="button"
                          onClick={() => setOpenLesson((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className="w-full flex items-center gap-3 text-left"
                        >
                          <span className="font-mono text-xs text-blood">{String(idx + 1).padStart(2, "0")}</span>
                          <span className="flex-1 font-display text-base sm:text-lg">{l.title}</span>
                          <ChevronDown size={16} className={`shrink-0 transition ${lessonOpen ? "rotate-180" : ""}`} />
                        </button>
                        {lessonOpen && (
                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{l.body}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



function Myths() {
  const myths = [
    {
      myth: "Retatrutide is just a stronger semaglutide.",
      evidence: "Retatrutide is a triple agonist (GLP-1, GIP, and glucagon receptors) with distinct metabolic and muscle-preservation effects. It is not simply a stronger GLP-1 peptide and remains investigational."
    },
    {
      myth: "GHK-Cu builds muscle like an anabolic peptide.",
      evidence: "GHK-Cu is primarily studied for tissue repair, wound healing, skin remodeling, and gene-expression modulation. It is not a direct muscle-building anabolic compound."
    },
    {
      myth: "BPC-157 heals any injury overnight.",
      evidence: "BPC-157 shows tendon, ligament, gut, and connective-tissue repair potential in animal models, but recovery is gradual, context-dependent, and human data is limited."
    },
    {
      myth: "KPV is only a skin/melanocyte peptide.",
      evidence: "KPV is an alpha-MSH fragment studied for anti-inflammatory, gut-barrier, and immune-modulating effects. Its research scope extends beyond pigmentation."
    },
    {
      myth: "Tesamorelin burns fat directly.",
      evidence: "Tesamorelin is a GHRH analog that raises GH and IGF-1. It is FDA-approved for HIV-associated visceral adiposity reduction, but it is not a direct fat burner and still requires diet and training."
    },
    {
      myth: "MOTS-c is a testosterone booster.",
      evidence: "MOTS-c is a mitochondrial-derived peptide studied for metabolic regulation, insulin sensitivity, and exercise-mimetic effects. It does not directly increase testosterone."
    },
    {
      myth: "MT2 (Melanotan II) is a safe tanning peptide.",
      evidence: "Melanotan II can cause nausea, flushing, increased moles, darkened freckles, spontaneous erections, and potential cardiovascular and renal concerns. It is not risk-free."
    },
    {
      myth: "Semax is a stimulant like caffeine or Adderall.",
      evidence: "Semax is a synthetic ACTH fragment studied for neuroprotection, BDNF modulation, and cognitive effects. Its mechanism is not a simple stimulant and responses vary widely."
    },
    {
      myth: "Selank works immediately and eliminates all anxiety.",
      evidence: "Selank is a tuftsin analog studied for anxiolytic and immune-modulating effects. Benefits are often subtle, cumulative, and individual—not a rapid cure for anxiety."
    },
    {
      myth: "Peptides work instantly.",
      evidence: "Most research peptides need days to weeks to show measurable effects. Tissue-repair, body-composition, and GH-axis changes are gradual and depend on consistency, dose, sleep, nutrition, and training."
    },
    {
      myth: "More peptide = better results.",
      evidence: "Dosing follows an inverted-U curve in most research. Exceeding studied ranges often increases side effects, desensitization, and cost without improving outcomes."
    },
    {
      myth: "You can take peptides orally like a pill.",
      evidence: "Most peptides are not orally bioavailable because stomach acids and enzymes break them down. Research administration is typically subcutaneous injection with an insulin syringe."
    },
    {
      myth: "Peptides are just steroids.",
      evidence: "Peptides are short chains of amino acids that signal existing pathways. Steroids are hormone-based molecules that enter cells and alter gene expression directly. They are different classes of compounds with different mechanisms and risk profiles."
    },
    {
      myth: "Peptides don't require training or diet to work.",
      evidence: "Peptides are research tools, not substitutes for training, protein intake, sleep, and a calorie plan. The best outcomes are seen when compounds are layered on top of solid fundamentals, not in place of them."
    },
    {
      myth: "All peptides are legal for human use.",
      evidence: "Many peptides are sold for research purposes only and are not FDA-approved or approved by equivalent agencies for human consumption. The legal status and intended use vary by compound, country, and vendor labeling."
    },
    {
      myth: "You don't need to worry about side effects or monitoring.",
      evidence: "Every compound has potential side effects, contraindications, and interactions. Research best practice includes tracking markers, symptoms, and stopping if adverse reactions appear."
    },
    {
      myth: "Generic peptides from any source are the same.",
      evidence: "Purity and identity vary widely between suppliers. Reputable vendors provide third-party certificates of analysis (COAs). Poor-quality or mislabeled products are one of the biggest real-world risks in this space."
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow">Research & Education</div>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl">Myth vs Evidence</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Common claims about peptides compared with what the research actually shows. For educational purposes only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {myths.map((m) => (
          <article key={m.myth} className="border border-foreground/15 p-5 sm:p-6 hover:border-blood transition">
            <div className="flex items-start gap-3">
              <XCircle size={18} className="text-blood shrink-0 mt-0.5" />
              <div>
                <div className="text-eyebrow mb-1">Myth</div>
                <p className="font-display text-base sm:text-lg leading-snug">{m.myth}</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-eyebrow mb-1">Evidence</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.evidence}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="border border-blood/40 bg-blood/5 p-5 text-sm text-muted-foreground">
        <span className="text-blood font-mono uppercase tracking-[0.14em] text-xs">Reminder</span>
        <p className="mt-2">This content is educational and not a substitute for advice from a qualified medical professional. Always research independently and consult a physician before using any peptide or research compound.</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-eyebrow block mb-1.5">{label}</span>
      {children}
    </label>
  );
}



