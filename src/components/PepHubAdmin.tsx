import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import {
  adminListPepHubMembers,
  adminDeletePepHubMember,
  adminListSources,
  adminSaveSource,
  adminDeleteSource,
  adminUploadSourceLogo,
  adminSendDealAlert,
  adminListDealAlerts,
  type PepAlert,
  type PepMember,
  type PepSource,
} from "@/lib/pephub.functions";
import PepHubSaleMonitor from "@/components/PepHubSaleMonitor";

type SubTab = "sources" | "monitor" | "members" | "alerts";

const emptyForm = {
  id: "",
  name: "",
  url: "",
  affiliate_url: "",
  description: "",
  category: "",
  discount_code: "",
  logo_url: "",
  is_active: true,
  expert_verified: false,
  sort_order: 0,
};

export default function PepHubAdmin() {
  const [sub, setSub] = useState<SubTab>("sources");
  const [sources, setSources] = useState<PepSource[]>([]);
  const [members, setMembers] = useState<PepMember[]>([]);
  const [alerts, setAlerts] = useState<PepAlert[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);

  const [alertSource, setAlertSource] = useState("");
  const [headline, setHeadline] = useState("");
  const [details, setDetails] = useState("");
  const [promo, setPromo] = useState("");
  const [sending, setSending] = useState(false);

  const listSources = useServerFn(adminListSources);
  const saveSource = useServerFn(adminSaveSource);
  const delSource = useServerFn(adminDeleteSource);
  const listMembers = useServerFn(adminListPepHubMembers);
  const delMember = useServerFn(adminDeletePepHubMember);
  const uploadLogo = useServerFn(adminUploadSourceLogo);
  const sendAlert = useServerFn(adminSendDealAlert);
  const listAlerts = useServerFn(adminListDealAlerts);

  const load = useCallback(async () => {
    // Each request is fetched independently with one retry: a transient server
    // hiccup on one of them should not blank out the whole PepHub panel.
    async function attempt<T>(fn: () => Promise<T>): Promise<T | null> {
      for (let i = 0; i < 2; i++) {
        try {
          return await fn();
        } catch {
          if (i === 1) return null;
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      return null;
    }

    const [s, m, a] = await Promise.all([
      attempt(() => listSources({})),
      attempt(() => listMembers({})),
      attempt(() => listAlerts({})),
    ]);

    if (s) setSources(s.sources);
    if (m) setMembers(m.members);
    if (a) setAlerts(a.alerts);
    if (!s || !m || !a) toast.error("Some PepHub data failed to load. Try refreshing.");
  }, [listSources, listMembers, listAlerts]);

  useEffect(() => { load(); }, [load]);

  async function submitSource(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveSource({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name.trim(),
          url: form.url.trim(),
          affiliate_url: form.affiliate_url.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          discount_code: form.discount_code.trim() || null,
          logo_url: form.logo_url.trim() || null,
          is_active: form.is_active,
          expert_verified: form.expert_verified,
          sort_order: Number(form.sort_order) || 0,
        },
      });
      toast.success(form.id ? "Source updated" : "Source added");
      setForm({ ...emptyForm });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function pickLogo(file: File) {
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (const b of buf) bin += String.fromCharCode(b);
      const res = await uploadLogo({
        data: { filename: file.name, contentType: file.type || "image/png", dataBase64: btoa(bin) },
      });
      setForm((f) => ({ ...f, logo_url: res.url }));
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!alertSource || !headline.trim()) return;
    if (!confirm(`Email ${members.filter((m) => m.subscribed).length} PepHub members about this deal?`)) return;
    setSending(true);
    try {
      const res = await sendAlert({
        data: {
          sourceId: alertSource,
          headline: headline.trim(),
          ...(details.trim() ? { details: details.trim() } : {}),
          ...(promo.trim() ? { promoCode: promo.trim() } : {}),
        },
      });
      if (res.total === 0) {
        toast.warning("No subscribed PepHub members to email yet");
      } else if (res.sent < res.total) {
        toast.warning(
          `Sent to ${res.sent} of ${res.total} members (${res.total - res.sent} unsubscribed or blocked)`,
        );
      } else {
        toast.success(`Sale alert emailed to ${res.sent} member${res.sent === 1 ? "" : "s"}`);
      }

      setHeadline(""); setDetails(""); setPromo("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const input = "mt-2 w-full rounded-xl border border-foreground/15 bg-background px-4 py-2.5 text-sm outline-none focus:border-blood";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {([
          { k: "sources", l: `Sources (${sources.length})` },
          { k: "monitor", l: "Sale monitor" },
          { k: "members", l: `Members (${members.length})` },
          { k: "alerts", l: "Sale alerts" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setSub(t.k)}
            className={`rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition ${sub === t.k ? "bg-blood text-bone" : "bg-foreground/5 text-muted-foreground hover:text-foreground"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {sub === "sources" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={submitSource} className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
            <h3 className="text-xl">{form.id ? "Edit source" : "Add trusted source"}</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-eyebrow">Name</label>
                <input className={input} value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-eyebrow">URL</label>
                <input className={input} value={form.url} required placeholder="https://" onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </div>
              <div>
                <label className="text-eyebrow">Affiliate URL (optional)</label>
                <input className={input} value={form.affiliate_url} placeholder="https://" onChange={(e) => setForm({ ...form, affiliate_url: e.target.value })} />
              </div>
              <div>
                <label className="text-eyebrow">Logo</label>
                <div className="mt-1 flex items-center gap-3">
                  {form.logo_url && (
                    <img src={form.logo_url} alt="Logo preview" className="h-12 w-12 rounded-lg border border-foreground/10 object-contain p-1" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) pickLogo(f); }}
                  />
                  {form.logo_url && (
                    <button type="button" className="text-xs underline" onClick={() => setForm({ ...form, logo_url: "" })}>Remove</button>
                  )}
                </div>
                <input className={input} value={form.logo_url} placeholder="or paste an image URL" onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
              </div>
              <div>
                <label className="text-eyebrow">Description</label>
                <textarea className={input} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-eyebrow">Category</label>
                  <input className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div>
                  <label className="text-eyebrow">Discount code</label>
                  <input className={input} value={form.discount_code} onChange={(e) => setForm({ ...form, discount_code: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-eyebrow">Sort order</label>
                  <input type="number" className={input} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Visible on PepHub
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" checked={form.expert_verified} onChange={(e) => setForm({ ...form, expert_verified: e.target.checked })} />
                  Expert verified
                </label>
              </div>
              <div className="flex gap-2">
                <button disabled={busy} className="btn-primary">
                  {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} {form.id ? "Save" : "Add source"}
                </button>
                {form.id && (
                  <button type="button" className="btn-ghost" onClick={() => setForm({ ...emptyForm })}>Cancel</button>
                )}
              </div>
            </div>
          </form>

          <div className="space-y-3">
            {sources.length === 0 && <p className="text-sm text-muted-foreground">No sources yet.</p>}
            {sources.map((s) => (
              <div key={s.id} className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg">{s.name}</h4>
                      {!s.is_active && <span className="rounded-full bg-foreground/10 px-2 py-0.5 font-mono text-[10px] uppercase">Hidden</span>}
                      {s.expert_verified && <span className="rounded-full bg-blood/10 px-2 py-0.5 font-mono text-[10px] uppercase text-blood">Expert Verified</span>}
                    </div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-muted-foreground hover:text-blood">{s.url}</a>
                    {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
                    {s.discount_code && <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-blood">Code {s.discount_code}</div>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className="btn-ghost"
                      onClick={() => setForm({
                        id: s.id, name: s.name, url: s.url, affiliate_url: s.affiliate_url ?? "",
                        description: s.description ?? "", category: s.category ?? "",
                        discount_code: s.discount_code ?? "", logo_url: s.logo_url ?? "", is_active: s.is_active, expert_verified: s.expert_verified, sort_order: s.sort_order,
                      })}
                    >Edit</button>
                    <button
                      className="btn-ghost text-blood"
                      onClick={async () => {
                        if (!confirm(`Delete ${s.name}?`)) return;
                        await delSource({ data: { id: s.id } });
                        load();
                      }}
                    ><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === "monitor" && <PepHubSaleMonitor />}

      {sub === "members" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-foreground/10 bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-muted-foreground">No PepHub signups yet.</td></tr>
              )}
              {members.map((m) => (
                <tr key={m.id} className="border-b border-foreground/5 last:border-0">
                  <td className="px-5 py-3">{m.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="text-blood"
                      onClick={async () => {
                        if (!confirm(`Remove ${m.email}?`)) return;
                        await delMember({ data: { id: m.id } });
                        load();
                      }}
                    ><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sub === "alerts" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={send} className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
            <h3 className="text-xl">Send a sale alert</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Emails every subscribed PepHub member ({members.filter((m) => m.subscribed).length}).
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-eyebrow">Source</label>
                <select className={input} value={alertSource} required onChange={(e) => setAlertSource(e.target.value)}>
                  <option value="">Select a source…</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-eyebrow">Headline</label>
                <input className={input} value={headline} required placeholder="30% off site-wide this weekend" onChange={(e) => setHeadline(e.target.value)} />
              </div>
              <div>
                <label className="text-eyebrow">Details</label>
                <textarea className={input} rows={4} value={details} onChange={(e) => setDetails(e.target.value)} />
              </div>
              <div>
                <label className="text-eyebrow">Promo code (optional)</label>
                <input className={input} value={promo} onChange={(e) => setPromo(e.target.value)} />
              </div>
              <button disabled={sending} className="btn-primary">
                {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Send alert
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts sent yet.</p>}
            {alerts.map((a) => (
              <div key={a.id} className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                  {new Date(a.sent_at).toLocaleString()} · {a.recipients} sent
                </div>
                <h4 className="mt-1 text-lg">{a.headline}</h4>
                {a.details && <p className="mt-1 text-sm text-muted-foreground">{a.details}</p>}
                {a.promo_code && <div className="mt-2 font-mono text-[11px] uppercase text-blood">Code {a.promo_code}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
