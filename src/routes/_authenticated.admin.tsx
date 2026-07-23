import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LogOut, Users, Inbox, FileText, ArrowLeft, Search, Sparkles, Send, Save, Download, Loader2, DollarSign, Check, X, Trash2, Lock } from "lucide-react";
import { generateProtocolDraft, saveProtocolDraft, sendProtocol, getProtocolDownloadUrl } from "@/lib/protocols.functions";
import { approveAffiliate, rejectAffiliate, deleteAffiliate, markAffiliatePaid, resendApprovedAffiliateEmails, getAffiliatePayoutRate, setAffiliatePayoutRate } from "@/lib/affiliates.functions";
import { grantFullAccessByEmail } from "@/lib/admin-access.functions";
import { grantAccess, revokeAccess, listAccess } from "@/lib/admin-access.functions";
import { getStripeEnvironment } from "@/lib/stripe";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Titan Elite" }] }),
  component: Admin,
});

type Tab = "clients" | "intakes" | "protocols" | "affiliates";


function Admin() {
  const { user, role, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("clients");

  useEffect(() => {
    if (!loading && role && role !== "admin") nav({ to: "/dashboard" });
  }, [role, loading, nav]);

  if (loading || !user) return <div className="min-h-dvh bg-background flex items-center justify-center text-eyebrow">Loading…</div>;
  if (role !== "admin") {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-eyebrow">Restricted</div>
          <h1 className="mt-4 text-4xl">Admin access required.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your account isn't assigned the admin role. Contact your administrator to have the admin role assigned.
          </p>
          <Link to="/dashboard" className="mt-6 inline-flex btn-ghost"><ArrowLeft size={14} /> Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-foreground/10 bg-ink text-bone">
        <div className="container-edge h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 bg-blood" />
            <span className="font-display text-xl tracking-wider">TITAN ELITE / ADMIN</span>
          </Link>
          <button onClick={signOut} className="font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 hover:text-blood">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>
      <section className="container-edge py-12">
        <div className="text-eyebrow">Admin Dashboard</div>
        <h1 className="mt-4 text-5xl lg:text-6xl">Roster.</h1>

        <nav className="mt-10 flex gap-1 border-b border-foreground/15">
          {([
            { k: "clients", l: "Clients", i: Users },
            { k: "intakes", l: "Intakes", i: Inbox },
            { k: "protocols", l: "Protocols", i: FileText },
            { k: "affiliates", l: "Affiliates", i: DollarSign },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 border-b-2 transition ${tab === t.k ? "border-blood text-blood" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <t.i size={14} /> {t.l}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          {tab === "clients" && <Clients />}
          {tab === "intakes" && <Intakes />}
          {tab === "protocols" && <ProtocolsAdmin />}
          {tab === "affiliates" && <AffiliatesAdmin />}
        </div>
      </section>
    </div>
  );
}

function Clients() {
  const [rows, setRows] = useState<{ id: string; full_name: string | null; email: string | null; created_at: string }[]>([]);
  const [access, setAccess] = useState<Record<string, "limited" | "full">>({});
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const grantFn = useServerFn(grantAccess);
  const revokeFn = useServerFn(revokeAccess);
  const listFn = useServerFn(listAccess);

  let env: "sandbox" | "live" = "sandbox";
  try { env = getStripeEnvironment(); } catch { /* keep default */ }

  const reload = async () => {
    const [{ data }, accessRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }),
      listFn({ data: { environment: env } }).catch(() => ({ rows: [] as { user_id: string; tier: "limited" | "full" }[] })),
    ]);
    setRows(data ?? []);
    const map: Record<string, "limited" | "full"> = {};
    accessRes.rows.forEach((r) => { map[r.user_id] = r.tier; });
    setAccess(map);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const grant = async (userId: string, tier: "limited" | "full") => {
    setBusyId(userId);
    try {
      await grantFn({ data: { userId, tier, environment: env } });
      toast.success(`Granted ${tier === "full" ? "Full" : "Limited"} access.`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to grant access");
    } finally { setBusyId(null); }
  };
  const revoke = async (userId: string) => {
    if (!confirm("Revoke this client's dashboard access?")) return;
    setBusyId(userId);
    try {
      await revokeFn({ data: { userId, environment: env } });
      toast.success("Access revoked.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke access");
    } finally { setBusyId(null); }
  };

  const filtered = rows.filter((r) => !q || `${r.full_name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-full pl-10 pr-4 py-3 bg-background border border-foreground/20 focus:outline-none focus:border-blood" />
        </div>
        <span className="text-eyebrow text-muted-foreground">Env: {env}</span>
      </div>
      <div className="border border-foreground/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-eyebrow">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Access</th>
              <th className="p-3">Joined</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tier = access[r.id];
              return (
                <tr key={r.id} className="border-t border-foreground/10 hover:bg-muted/40">
                  <td className="p-3 font-medium">{r.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.email}</td>
                  <td className="p-3">
                    {tier === "full" ? (
                      <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Full
                      </span>
                    ) : tier === "limited" ? (
                      <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-600">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> Limited
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        <Lock size={10} /> None
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {busyId === r.id ? (
                      <Loader2 size={14} className="animate-spin inline text-muted-foreground" />
                    ) : (
                      <div className="inline-flex gap-1">
                        {tier !== "limited" && tier !== "full" && (
                          <button onClick={() => grant(r.id, "limited")} className="px-2 py-1 border border-foreground/20 font-mono text-[10px] uppercase tracking-[0.14em] hover:border-blood hover:text-blood">
                            Grant Limited
                          </button>
                        )}
                        {tier !== "full" && (
                          <button onClick={() => grant(r.id, "full")} className="px-2 py-1 border border-foreground/20 font-mono text-[10px] uppercase tracking-[0.14em] hover:border-blood hover:text-blood">
                            Grant Full
                          </button>
                        )}
                        {(tier === "limited" || tier === "full") && (
                          <button onClick={() => revoke(r.id)} className="px-2 py-1 border border-foreground/20 font-mono text-[10px] uppercase tracking-[0.14em] text-blood hover:bg-blood hover:text-background">
                            Revoke
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No clients yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}


type IntakeRow = {
  id: string; user_id: string; status: string; submitted_at: string;
  age: number | null; gender: string | null; weight: string | null; height: string | null;
  fitness_experience: string | null; current_program: string | null;
  current_supplements: string | null; current_medications: string | null;
  injury_history: string | null; health_conditions: string | null;
  weightlifting_goals: string | null; strength_goals: string | null;
  muscle_gain_goals: string | null; fat_loss_goals: string | null;
  peptide_experience: string | null; peptides_of_interest: string | null;
  lifestyle: string | null; sleep_habits: string | null; nutrition_habits: string | null;
};

function Intakes() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [protoMap, setProtoMap] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<IntakeRow | null>(null);
  useEffect(() => {
    (async () => {
      const [{ data: intakeData }, { data: protoData }] = await Promise.all([
        supabase.from("intakes").select("*").order("submitted_at", { ascending: false }),
        supabase.from("protocols").select("source_intake_id, status").not("source_intake_id", "is", null),
      ]);
      setRows((intakeData as IntakeRow[]) ?? []);
      const map: Record<string, string> = {};
      (protoData ?? []).forEach((p: { source_intake_id: string | null; status: string }) => {
        if (p.source_intake_id) map[p.source_intake_id] = p.status;
      });
      setProtoMap(map);
    })();
  }, []);
  return (
    <div>
      <div className="border border-foreground/10">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-eyebrow">
            <tr><th className="p-3">Submitted</th><th className="p-3">Client ID</th><th className="p-3">Protocol</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pStatus = protoMap[r.id];
              const sent = pStatus === "delivered" || pStatus === "sent" || pStatus === "viewed";
              const inProgress = pStatus && !sent;
              return (
                <tr key={r.id} className="border-t border-foreground/10 hover:bg-muted/40">
                  <td className="p-3 font-mono text-xs">{new Date(r.submitted_at).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                  <td className="p-3">
                    {sent ? (
                      <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sent
                      </span>
                    ) : inProgress ? (
                      <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-600">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-blood">
                        <span className="h-2 w-2 rounded-full bg-blood" /> Needs protocol
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right"><button onClick={() => setOpen(r)} className="text-blood font-mono text-xs uppercase tracking-[0.14em]">Review →</button></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No intakes submitted yet.</td></tr>}
          </tbody>
        </table>
      </div>


      {open && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-background max-w-3xl w-full my-10 border border-foreground/20">
            <div className="p-6 border-b border-foreground/10 flex justify-between items-center">
              <div>
                <div className="text-eyebrow">Intake</div>
                <h3 className="font-display text-3xl">Client {open.user_id.slice(0, 8)}…</h3>
              </div>
              <button onClick={() => setOpen(null)} className="font-mono text-xs uppercase">Close ✕</button>
            </div>
            <div className="p-6 grid sm:grid-cols-3 gap-4 text-sm">
              <Stat l="Age" v={open.age?.toString()} />
              <Stat l="Gender" v={open.gender} />
              <Stat l="Height" v={open.height} />
              <Stat l="Weight" v={open.weight} />
            </div>
            <div className="px-6 pb-6 space-y-4 text-sm">
              {[
                ["Fitness Experience", open.fitness_experience],
                ["Current Program", open.current_program],
                ["Supplements", open.current_supplements],
                ["Medications", open.current_medications],
                ["Injury History", open.injury_history],
                ["Health Conditions", open.health_conditions],
                ["Weightlifting Goals", open.weightlifting_goals],
                ["Strength Goals", open.strength_goals],
                ["Muscle Gain Goals", open.muscle_gain_goals],
                ["Fat Loss Goals", open.fat_loss_goals],
                ["Peptide Experience", open.peptide_experience],
                ["Peptides of Interest", open.peptides_of_interest],
                ["Lifestyle", open.lifestyle],
                ["Sleep Habits", open.sleep_habits],
                ["Nutrition Habits", open.nutrition_habits],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <div className="text-eyebrow">{l}</div>
                  <p className="mt-1 whitespace-pre-wrap">{(v as string) || <span className="text-muted-foreground">—</span>}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-foreground/10 p-6">
              <AssignProtocol userId={open.user_id} intakeId={open.id} onDone={() => setOpen(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string | null | undefined }) {
  return (
    <div className="border border-foreground/10 p-3">
      <div className="text-eyebrow">{l}</div>
      <div className="font-display text-xl">{v || "—"}</div>
    </div>
  );
}

type Draft = {
  client_name?: string;
  overview?: string;
  training_block?: {
    weeks?: number;
    split?: string;
    key_lifts?: string[];
    progression?: string;
    weekly_schedule?: string;
  };
  peptide_protocol?: {
    overview?: string;
    items?: string;
    educational_disclaimer?: string;
  };
  nutrition_notes?: string;
  recovery_notes?: string;
};

function coerceToText(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    return v.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        if ("day" in o || "focus" in o || "sessions" in o) {
          const sessions = Array.isArray(o.sessions) ? (o.sessions as unknown[]).join("\n   ") : "";
          return `${o.day ?? ""} — ${o.focus ?? ""}\n   ${sessions}`.trim();
        }
        if ("name" in o) {
          const meta = [o.dose, o.timing].filter(Boolean).join(" · ");
          return [o.name, meta, o.notes].filter(Boolean).join("\n");
        }
        return JSON.stringify(item, null, 2);
      }
      return String(item);
    }).join("\n\n");
  }
  return String(v);
}

function normalizeDraft(input: unknown): Draft | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  const tb = (d.training_block ?? {}) as Record<string, unknown>;
  const pp = (d.peptide_protocol ?? {}) as Record<string, unknown>;
  return {
    client_name: d.client_name as string | undefined,
    overview: d.overview as string | undefined,
    training_block: {
      weeks: tb.weeks as number | undefined,
      split: tb.split as string | undefined,
      key_lifts: (tb.key_lifts as string[] | undefined) ?? undefined,
      progression: tb.progression as string | undefined,
      weekly_schedule: coerceToText(tb.weekly_schedule),
    },
    peptide_protocol: {
      overview: pp.overview as string | undefined,
      items: coerceToText(pp.items),
      educational_disclaimer: pp.educational_disclaimer as string | undefined,
    },
    nutrition_notes: d.nutrition_notes as string | undefined,
    recovery_notes: d.recovery_notes as string | undefined,
  };
}

function AssignProtocol({ userId, intakeId, onDone }: { userId: string; intakeId: string; onDone: () => void }) {
  const generateFn = useServerFn(generateProtocolDraft);
  const saveFn = useServerFn(saveProtocolDraft);
  const sendFn = useServerFn(sendProtocol);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Load existing draft for this intake if present
    supabase.from("protocols").select("id, title, draft_content, status").eq("source_intake_id", intakeId).maybeSingle().then(({ data }) => {
      if (data) {
        setProtocolId(data.id);
        setTitle(data.title);
        setDraft(normalizeDraft(data.draft_content));
      }
    });
  }, [intakeId]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await generateFn({ data: { intakeId } });
      setProtocolId(res.protocolId);
      setDraft(res.draft as Draft);
      setTitle((prev) => prev || `Protocol — ${(res.draft as Draft).client_name ?? "Client"}`);
      toast.success("AI draft generated. Review and edit before sending.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!protocolId || !draft) return;
    setSaving(true);
    try {
      await saveFn({ data: { protocolId, draft, title: title || undefined } });
      toast.success("Draft saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    if (!protocolId) return;
    if (!confirm("Render PDF and send to client? They'll receive an email with the protocol.")) return;
    setSending(true);
    try {
      await save();
      await sendFn({ data: { protocolId } });
      toast.success("Protocol delivered and emailed.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  function updateDraft<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...(d ?? {}), [k]: v }));
  }
  function updateTraining<K extends keyof NonNullable<Draft["training_block"]>>(k: K, v: NonNullable<Draft["training_block"]>[K]) {
    setDraft((d) => ({ ...(d ?? {}), training_block: { ...(d?.training_block ?? {}), [k]: v } }));
  }
  function updatePeptides<K extends keyof NonNullable<Draft["peptide_protocol"]>>(k: K, v: NonNullable<Draft["peptide_protocol"]>[K]) {
    setDraft((d) => ({ ...(d ?? {}), peptide_protocol: { ...(d?.peptide_protocol ?? {}), [k]: v } }));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="font-display text-2xl">Protocol Draft</div>
        <button
          onClick={generate}
          disabled={generating}
          className="btn-blood hover:btn-blood-hover disabled:opacity-50"
        >
          {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> {draft ? "Regenerate with AI" : "Generate draft with AI"}</>}
        </button>
      </div>

      {!draft && !generating && (
        <div className="border border-dashed border-foreground/20 p-8 text-center text-sm text-muted-foreground">
          Click "Generate draft with AI" to create a starting protocol from this intake.
        </div>
      )}

      {draft && (
        <div className="space-y-4 text-sm">
          <Mini label="Title" value={title} onChange={setTitle} />
          <Mini label="Client Name" value={draft.client_name ?? ""} onChange={(v) => updateDraft("client_name", v)} />
          <Area label="Overview" value={draft.overview ?? ""} onChange={(v) => updateDraft("overview", v)} />

          <div className="border border-foreground/10 p-4 space-y-3">
            <div className="text-eyebrow">Training Block</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Mini label="Weeks" type="number" value={String(draft.training_block?.weeks ?? "")} onChange={(v) => updateTraining("weeks", v ? parseInt(v) : undefined)} />
              <Mini label="Split" value={draft.training_block?.split ?? ""} onChange={(v) => updateTraining("split", v)} />
            </div>
            <Area label="Progression" value={draft.training_block?.progression ?? ""} onChange={(v) => updateTraining("progression", v)} />
            <Area label="Key Lifts (one per line)" value={(draft.training_block?.key_lifts ?? []).join("\n")} onChange={(v) => updateTraining("key_lifts", v.split("\n").filter(Boolean))} />
            <Area label="Weekly Schedule" value={draft.training_block?.weekly_schedule ?? ""} onChange={(v) => updateTraining("weekly_schedule", v)} />
          </div>

          <div className="border border-foreground/10 p-4 space-y-3">
            <div className="text-eyebrow">Peptide Protocol (Educational)</div>
            <Area label="Overview" value={draft.peptide_protocol?.overview ?? ""} onChange={(v) => updatePeptides("overview", v)} />
            <Area label="Items" value={draft.peptide_protocol?.items ?? ""} onChange={(v) => updatePeptides("items", v)} />
            <Area label="Educational Disclaimer" value={draft.peptide_protocol?.educational_disclaimer ?? ""} onChange={(v) => updatePeptides("educational_disclaimer", v)} />
          </div>

          <Area label="Nutrition Notes" value={draft.nutrition_notes ?? ""} onChange={(v) => updateDraft("nutrition_notes", v)} />
          <Area label="Recovery Notes" value={draft.recovery_notes ?? ""} onChange={(v) => updateDraft("recovery_notes", v)} />

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={save} disabled={saving || !protocolId} className="btn-ghost hover:bg-foreground hover:text-background disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save draft</>}
            </button>
            <button onClick={send} disabled={sending || !protocolId} className="btn-blood hover:btn-blood-hover disabled:opacity-50">
              {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Approve & send to client</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood" />
    </div>
  );
}
function Area({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}</label>
      <textarea rows={mono ? 6 : 3} value={value} onChange={(e) => onChange(e.target.value)} className={`w-full bg-background border border-foreground/20 px-3 py-2 focus:outline-none focus:border-blood ${mono ? "font-mono text-xs" : ""}`} />
    </div>
  );
}

function ProtocolsAdmin() {
  const downloadFn = useServerFn(getProtocolDownloadUrl);
  const [rows, setRows] = useState<{ id: string; user_id: string; type: string; title: string; status: string; created_at: string; viewed_at: string | null; delivered_at: string | null; pdf_storage_path: string | null }[]>([]);
  useEffect(() => {
    supabase.from("protocols").select("id, user_id, type, title, status, created_at, viewed_at, delivered_at, pdf_storage_path").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  async function download(id: string) {
    try {
      const { url } = await downloadFn({ data: { protocolId: id } });
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }
  return (
    <div className="border border-foreground/10">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-eyebrow">
          <tr><th className="p-3">Created</th><th className="p-3">Client</th><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Delivered</th><th className="p-3">Viewed</th><th className="p-3"></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-foreground/10">
              <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
              <td className="p-3 font-medium">{r.title}</td>
              <td className="p-3"><span className="text-eyebrow">{r.status}</span></td>
              <td className="p-3 text-xs">{r.delivered_at ? new Date(r.delivered_at).toLocaleDateString() : <span className="text-muted-foreground">—</span>}</td>
              <td className="p-3 text-xs">{r.viewed_at ? new Date(r.viewed_at).toLocaleDateString() : <span className="text-muted-foreground">—</span>}</td>
              <td className="p-3 text-right">
                {r.pdf_storage_path && (
                  <button onClick={() => download(r.id)} className="text-blood font-mono text-xs uppercase tracking-[0.14em] inline-flex items-center gap-1"><Download size={12} /> PDF</button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No protocols yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}



// ---------------- Affiliates Admin ----------------
type AffiliateRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  full_name: string | null;
  email: string;
  phone: string;
  desired_code: string;
  code: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  twitter: string | null;
  other_social: string | null;
  referral_count: number;
  earnings_cents: number;
  created_at: string;
};

function AffiliatesAdmin() {
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const approveFn = useServerFn(approveAffiliate);
  const rejectFn = useServerFn(rejectAffiliate);
  const deleteFn = useServerFn(deleteAffiliate);
  const paidFn = useServerFn(markAffiliatePaid);
  const resendFn = useServerFn(resendApprovedAffiliateEmails);
  const grantFn = useServerFn(grantFullAccessByEmail);
  const getRateFn = useServerFn(getAffiliatePayoutRate);
  const setRateFn = useServerFn(setAffiliatePayoutRate);
  const [rateDollars, setRateDollars] = useState<string>("25.00");
  const [rateDraft, setRateDraft] = useState<string>("");
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await getRateFn();
        setRateDollars((r.cents / 100).toFixed(2));
      } catch { /* noop */ }
    })();
  }, []);

  async function onSaveRate() {
    const raw = rateDraft;
    const amount = parseFloat(raw);
    if (isNaN(amount) || amount < 0) { toast.error("Enter a valid amount"); return; }
    setSavingRate(true);
    try {
      await setRateFn({ data: { amountDollars: amount } });
      setRateDollars(amount.toFixed(2));
      setRateDraft("");
      toast.success(`Payout set to $${amount.toFixed(2)} per 5 signups`);
      void load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSavingRate(false); }
  }

  async function onGrantAccess(r: AffiliateRow) {
    if (!confirm(`Grant Full Access to ${r.email}? They must have an account with this email.`)) return;
    try {
      await grantFn({ data: { email: r.email } });
      toast.success(`Full Access granted to ${r.email}`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("affiliates")
      .select("id, status, full_name, email, phone, desired_code, code, instagram, tiktok, youtube, twitter, other_social, referral_count, earnings_cents, created_at")
      .order("created_at", { ascending: false });
    setRows((data as AffiliateRow[] | null) ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const totalPending = rows.filter((r) => r.status === "pending").length;
  const totalOwed = rows.reduce((s, r) => s + (r.status === "approved" ? r.earnings_cents : 0), 0);

  async function onApprove(r: AffiliateRow) {
    const code = prompt("Assign affiliate code:", r.code ?? r.desired_code);
    if (!code) return;
    try {
      await approveFn({ data: { id: r.id, code } });
      toast.success("Approved");
      void load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function onReject(r: AffiliateRow) {
    if (!confirm(`Reject application from ${r.email}?`)) return;
    try { await rejectFn({ data: { id: r.id } }); toast.success("Rejected"); void load(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function onDelete(r: AffiliateRow) {
    if (!confirm(`Delete affiliate ${r.email}? This removes all referral records.`)) return;
    try { await deleteFn({ data: { id: r.id } }); toast.success("Deleted"); void load(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function onMarkPaid(r: AffiliateRow) {
    if (!confirm(`Mark $${(r.earnings_cents / 100).toFixed(2)} as paid to ${r.email}? This resets their earnings balance.`)) return;
    try { await paidFn({ data: { id: r.id } }); toast.success("Marked as paid"); void load(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="border border-foreground/15 p-4">
          <div className="text-eyebrow">Pending review</div>
          <div className="mt-2 font-display text-3xl">{totalPending}</div>
        </div>
        <div className="border border-foreground/15 p-4">
          <div className="text-eyebrow">Total affiliates</div>
          <div className="mt-2 font-display text-3xl">{rows.filter((r) => r.status === "approved").length}</div>
        </div>
        <div className="border border-foreground/15 p-4">
          <div className="text-eyebrow">Owed to affiliates</div>
          <div className="mt-2 font-display text-3xl text-blood">${(totalOwed / 100).toFixed(2)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] border ${filter === f ? "border-blood text-blood" : "border-foreground/20 text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
        <button
          onClick={async () => {
            if (!confirm("Send approval email to every approved affiliate?")) return;
            try {
              const res = await resendFn();
              toast.success(`Sent ${res.sent} approval email(s)`);
            } catch (e: any) {
              toast.error(e?.message ?? "Failed to send");
            }
          }}
          className="ml-auto px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] border border-blood text-blood hover:bg-blood/10"
        >
          Resend approval emails
        </button>
      </div>

      {loading ? (
        <div className="text-eyebrow">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground text-sm">No affiliates in this view.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="border border-foreground/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="font-display text-xl">{r.full_name || r.email}</div>
                    <StatusBadge status={r.status} />
                    {r.code && <span className="font-mono text-xs text-blood tracking-wider">CODE: {r.code}</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground font-mono">{r.email} · {r.phone}</div>
                  <div className="mt-3 text-xs text-muted-foreground grid sm:grid-cols-2 gap-x-6 gap-y-1">
                    {r.instagram && <div>IG: <span className="text-foreground">{r.instagram}</span></div>}
                    {r.tiktok && <div>TikTok: <span className="text-foreground">{r.tiktok}</span></div>}
                    {r.youtube && <div>YouTube: <span className="text-foreground">{r.youtube}</span></div>}
                    {r.twitter && <div>X: <span className="text-foreground">{r.twitter}</span></div>}
                    {r.other_social && <div className="sm:col-span-2">Other: <span className="text-foreground">{r.other_social}</span></div>}
                  </div>
                  {r.status === "approved" && (
                    <div className="mt-3 flex gap-6 text-sm items-center flex-wrap">
                      <div><span className="text-muted-foreground">Referrals:</span> <span className="font-mono text-foreground">{r.referral_count}</span></div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Owed: $</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={earningsDraft[r.id] ?? (r.earnings_cents / 100).toFixed(2)}
                          onChange={(e) => setEarningsDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          className="w-24 bg-background border border-foreground/20 px-2 py-1 font-mono text-sm text-blood"
                        />
                        {earningsDraft[r.id] !== undefined && earningsDraft[r.id] !== (r.earnings_cents / 100).toFixed(2) && (
                          <button onClick={() => onSaveEarnings(r)} className="btn-blood hover:btn-blood-hover text-[10px] px-2 py-1 font-mono uppercase tracking-wider">Save</button>
                        )}
                      </div>
                    </div>
                  )}
                  {r.status === "pending" && (
                    <div className="mt-2 text-xs text-muted-foreground">Requested code: <span className="text-foreground font-mono">{r.desired_code}</span></div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === "pending" && (
                    <>
                      <button onClick={() => onApprove(r)} className="btn-blood hover:btn-blood-hover text-xs px-4 py-2 flex items-center gap-1"><Check size={12} /> Approve</button>
                      <button onClick={() => onReject(r)} className="border border-foreground/20 hover:border-blood text-xs px-4 py-2 flex items-center gap-1"><X size={12} /> Reject</button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <button onClick={() => onGrantAccess(r)} className="border border-blood text-blood hover:bg-blood/10 text-xs px-4 py-2 flex items-center gap-1"><Check size={12} /> Grant Full Access</button>
                  )}
                  {r.status === "approved" && r.earnings_cents > 0 && (
                    <button onClick={() => onMarkPaid(r)} className="border border-foreground/20 hover:border-blood text-xs px-4 py-2 flex items-center gap-1"><DollarSign size={12} /> Mark paid</button>
                  )}
                  <button onClick={() => onDelete(r)} className="border border-foreground/20 hover:border-blood text-xs px-4 py-2 flex items-center gap-1"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const cls = status === "approved" ? "text-emerald-500 border-emerald-500/40"
    : status === "rejected" ? "text-blood border-blood/40"
    : "text-amber-500 border-amber-500/40";
  return <span className={`inline-block px-2 py-0.5 border font-mono text-[9px] uppercase tracking-[0.18em] ${cls}`}>{status}</span>;
}
