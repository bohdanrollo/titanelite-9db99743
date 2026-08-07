import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Loader2, MessageSquare } from "lucide-react";
import {
  listMyMessages,
  sendMessageToCoach,
  adminListThreads,
  adminListThread,
  adminSendMessage,
  adminListMessageableClients,
  type Msg,
} from "@/lib/messages.functions";

function fmt(ts: string) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Bubble({ mine, m }: { mine: boolean; m: Msg }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] border px-4 py-3 ${mine ? "border-blood/40 bg-blood/10" : "border-foreground/15 bg-card"}`}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
        <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{fmt(m.created_at)}</div>
      </div>
    </div>
  );
}

function Composer({ onSend, busy, placeholder }: { onSend: (b: string) => Promise<void>; busy: boolean; placeholder: string }) {
  const [text, setText] = useState("");
  async function submit() {
    const body = text.trim();
    if (!body || busy) return;
    await onSend(body);
    setText("");
  }
  return (
    <div className="mt-4 flex gap-2 items-end">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); } }}
        rows={2}
        placeholder={placeholder}
        className="flex-1 border border-foreground/15 bg-background px-3 py-2 text-sm resize-y"
      />
      <button onClick={() => void submit()} disabled={busy || !text.trim()} className="btn-blood hover:btn-blood-hover disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
      </button>
    </div>
  );
}

/** Client dashboard — Messages tab (Full Access only). */
export function ClientMessages({ myId }: { myId: string }) {
  const load = useServerFn(listMyMessages);
  const send = useServerFn(sendMessageToCoach);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await load();
      setAllowed(r.allowed);
      setMsgs(r.messages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 20000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length]);

  if (loading) return <div className="text-eyebrow">Loading messages…</div>;
  if (!allowed) return <div className="text-sm text-muted-foreground">Messaging is included with Full Access.</div>;

  return (
    <div>
      <div className="text-eyebrow">Messages</div>
      <h2 className="mt-2 text-3xl">Talk to your coach.</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
        Direct line to the Titan Elite coaching team. Ask about your protocol, training, or adjustments — replies land right here.
      </p>
      <div className="mt-6 border border-foreground/15 bg-card/40 p-4 max-h-[55vh] overflow-y-auto space-y-3">
        {msgs.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-3 text-blood" size={22} />
            No messages yet. Send the first one below.
          </div>
        ) : (
          msgs.map((m) => <Bubble key={m.id} mine={m.sender_id === myId} m={m} />)
        )}
        <div ref={endRef} />
      </div>
      <Composer
        busy={busy}
        placeholder="Write a message to your coach…"
        onSend={async (body) => {
          setBusy(true);
          try {
            await send({ data: { body } });
            await refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not send message");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

/** Admin dashboard — Messages tab. */
export function AdminMessages({ adminId }: { adminId: string }) {
  const loadThreads = useServerFn(adminListThreads);
  const loadThread = useServerFn(adminListThread);
  const send = useServerFn(adminSendMessage);
  const loadClients = useServerFn(adminListMessageableClients);

  const [threads, setThreads] = useState<Array<{ userId: string; fullName: string | null; email: string | null; lastBody: string; lastAt: string; unread: number }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshThreads = useCallback(async () => {
    try {
      const r = await loadThreads();
      setThreads(r.threads);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [loadThreads]);

  const openThread = useCallback(async (clientId: string) => {
    setActive(clientId);
    const r = await loadThread({ data: { clientId } });
    setMsgs(r.messages);
    void refreshThreads();
  }, [loadThread, refreshThreads]);

  useEffect(() => {
    void refreshThreads();
    loadClients().then((r) => setClients(r.clients)).catch(() => {});
  }, [refreshThreads, loadClients]);

  const activeClient = clients.find((c) => c.id === active) ?? threads.find((t) => t.userId === active);
  const activeLabel = activeClient
    ? ("full_name" in activeClient ? activeClient.full_name || activeClient.email : activeClient.fullName || activeClient.email)
    : "";

  if (loading) return <div className="text-eyebrow">Loading messages…</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="border border-foreground/15">
        <div className="px-4 py-3 border-b border-foreground/15 text-eyebrow">Conversations</div>
        <div className="max-h-[60vh] overflow-y-auto">
          {threads.length === 0 && <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>}
          {threads.map((t) => (
            <button
              key={t.userId}
              onClick={() => void openThread(t.userId)}
              className={`w-full text-left px-4 py-3 border-b border-foreground/10 transition ${active === t.userId ? "bg-blood/10" : "hover:bg-muted"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{t.fullName || t.email || t.userId.slice(0, 8)}</span>
                {t.unread > 0 && <span className="shrink-0 bg-blood text-bone text-[10px] px-1.5 py-0.5 font-mono">{t.unread}</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{t.lastBody}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mt-1">{fmt(t.lastAt)}</div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-foreground/15">
          <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Start new conversation</label>
          <select
            value=""
            onChange={(e) => { if (e.target.value) void openThread(e.target.value); }}
            className="mt-2 w-full border border-foreground/15 bg-background px-2 py-2 text-sm"
          >
            <option value="">Select a Full Access client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-foreground/15 p-4">
        {!active ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Select a conversation to view messages.</div>
        ) : (
          <>
            <div className="text-eyebrow">{activeLabel}</div>
            <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-3">
              {msgs.length === 0
                ? <div className="py-10 text-center text-sm text-muted-foreground">No messages yet.</div>
                : msgs.map((m) => <Bubble key={m.id} mine={m.sender_id === adminId} m={m} />)}
            </div>
            <Composer
              busy={busy}
              placeholder="Reply to this client…"
              onSend={async (body) => {
                setBusy(true);
                try {
                  await send({ data: { clientId: active, body } });
                  await openThread(active);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not send message");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
