import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Hash, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { getMyProfile, slugifyHandle, type PepProfile } from "@/lib/pephub";

export const Route = createFileRoute("/pephub/")({
  head: () => ({
    meta: [
      { title: "PepHub Chat — Free Peptide Chat Rooms | Titan Elite" },
      { name: "description", content: "PepHub is a free live chat community for peptide talk. Join channels, ask questions in real time, and share your journey with other members." },
      { property: "og:title", content: "PepHub — Live Peptide Chat Rooms" },
      { property: "og:description", content: "Free live chat channels for peptide questions, protocols, training and progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PepHub,
});

const CHANNELS = [
  { id: "general", label: "general", blurb: "Anything peptide related." },
  { id: "progress", label: "progress", blurb: "Share wins and check-ins." },
  { id: "questions", label: "questions", blurb: "Ask the room anything." },
] as const;

type ChatMsg = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  channel: string;
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayOf(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function PepHub() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<PepProfile | null>(null);
  const [channel, setChannel] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [authors, setAuthors] = useState<Record<string, PepProfile>>({});
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = CHANNELS.find((c) => c.id === channel) ?? CHANNELS[0];

  const loadAuthors = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => !authors[id]);
    if (missing.length === 0) return;
    const { data } = await supabase
      .from("pephub_profiles")
      .select("user_id, handle, display_name, bio, created_at")
      .in("user_id", missing);
    if (data?.length) {
      setAuthors((prev) => {
        const next = { ...prev };
        for (const p of data) next[p.user_id] = p as PepProfile;
        return next;
      });
    }
  }, [authors]);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("pephub_posts")
      .select("id, user_id, body, created_at, channel")
      .eq("channel", channel)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = ((data ?? []) as ChatMsg[]).slice().reverse();
    setMessages(rows);
    setReady(true);
    loadAuthors(rows.map((r) => r.user_id));
  }, [channel, loadAuthors]);

  useEffect(() => {
    if (loading) return;
    if (user) getMyProfile(user.id).then(setProfile);
    else setProfile(null);
  }, [user, loading]);

  useEffect(() => {
    setReady(false);
    refresh();
  }, [channel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates
  useEffect(() => {
    const ch = supabase
      .channel(`pephub-${channel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pephub_posts", filter: `channel=eq.${channel}` }, (payload) => {
        const row = payload.new as ChatMsg;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        loadAuthors([row.user_id]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "pephub_posts" }, (payload) => {
        const old = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channel, loadAuthors]);

  // Online presence (site-wide across PepHub)
  useEffect(() => {
    const ch = supabase
      .channel("pephub-online")
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(ch.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ at: new Date().toISOString() });
        }
      });
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, ready]);

  const grouped = useMemo(() => {
    const out: { msg: ChatMsg; showHeader: boolean; daySep: string | null }[] = [];
    messages.forEach((m, i) => {
      const prev = messages[i - 1];
      const daySep = !prev || dayOf(prev.created_at) !== dayOf(m.created_at) ? dayOf(m.created_at) : null;
      const sameAuthor =
        prev &&
        prev.user_id === m.user_id &&
        new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
      out.push({ msg: m, showHeader: !sameAuthor || !!daySep, daySep });
    });
    return out;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile || !body.trim() || busy) return;
    setBusy(true);
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("pephub_posts").insert({ user_id: user.id, body: text, channel });
    setBusy(false);
    if (error) {
      setBody(text);
      return toast.error(error.message);
    }
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("pephub_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="dark min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />

      <div className="container-edge flex-1 py-6">
        <div className="grid h-[calc(100dvh-11rem)] min-h-[520px] grid-cols-1 border border-foreground/10 md:grid-cols-[220px_1fr]">
          {/* Channel rail */}
          <aside className="hidden flex-col border-r border-foreground/10 bg-card/40 md:flex">
            <div className="border-b border-foreground/10 px-4 py-4">
              <div className="font-heavy text-xl leading-none">
                Pep<span className="text-blood">Hub</span>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Free chat rooms
              </div>
              <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {online} online
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              <div className="px-4 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Channels
              </div>
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChannel(c.id)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition ${
                    channel === c.id
                      ? "bg-blood/15 text-foreground"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <Hash className="h-3.5 w-3.5 text-blood" />
                  {c.label}
                </button>
              ))}
            </div>
            {profile && (
              <div className="border-t border-foreground/10 px-4 py-3">
                <div className="truncate text-sm">{profile.display_name}</div>
                <Link
                  to="/pephub/u/$handle"
                  params={{ handle: profile.handle }}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-blood hover:underline"
                >
                  @{profile.handle}
                </Link>
              </div>
            )}
          </aside>

          {/* Chat column */}
          <section className="flex min-h-0 flex-col">
            <header className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3">
              <Hash className="h-4 w-4 text-blood" />
              <div className="font-heavy text-lg leading-none">{active.label}</div>
              <div className="hidden truncate text-xs text-muted-foreground sm:block">{active.blurb}</div>
              <div className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {online} online
              </div>
            </header>

            {/* mobile channel picker */}
            <div className="flex gap-2 overflow-x-auto border-b border-foreground/10 px-3 py-2 md:hidden">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChannel(c.id)}
                  className={`whitespace-nowrap px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${
                    channel === c.id ? "bg-blood/20 text-foreground" : "text-muted-foreground"
                  }`}
                >
                  #{c.label}
                </button>
              ))}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {!ready && <p className="text-sm text-muted-foreground">Connecting…</p>}
              {ready && messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing in #{active.label} yet. Say something.
                </p>
              )}
              <div className="space-y-0.5">
                {grouped.map(({ msg, showHeader, daySep }) => {
                  const author = authors[msg.user_id];
                  return (
                    <div key={msg.id}>
                      {daySep && (
                        <div className="my-4 flex items-center gap-3">
                          <div className="h-px flex-1 bg-foreground/10" />
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {daySep}
                          </div>
                          <div className="h-px flex-1 bg-foreground/10" />
                        </div>
                      )}
                      <div className={`group flex gap-3 px-2 py-0.5 hover:bg-foreground/5 ${showHeader ? "mt-3" : ""}`}>
                        <div className="w-9 shrink-0">
                          {showHeader ? (
                            <div className="flex h-9 w-9 items-center justify-center bg-blood/20 font-heavy text-sm text-blood">
                              {(author?.display_name ?? "?").slice(0, 1).toUpperCase()}
                            </div>
                          ) : (
                            <div className="pt-1 text-right font-mono text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100">
                              {timeOf(msg.created_at)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {showHeader && (
                            <div className="flex items-baseline gap-2">
                              {author ? (
                                <Link
                                  to="/pephub/u/$handle"
                                  params={{ handle: author.handle }}
                                  className="font-heavy text-sm hover:text-blood"
                                >
                                  {author.display_name}
                                </Link>
                              ) : (
                                <span className="font-heavy text-sm text-muted-foreground">Member</span>
                              )}
                              <span className="font-mono text-[10px] text-muted-foreground">{timeOf(msg.created_at)}</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{msg.body}</p>
                        </div>
                        {user?.id === msg.user_id && (
                          <button
                            onClick={() => remove(msg.id)}
                            className="shrink-0 self-start text-muted-foreground opacity-0 transition hover:text-blood group-hover:opacity-100"
                            aria-label="Delete message"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-foreground/10 p-3">
              {!user && (
                <div className="flex flex-wrap items-center justify-between gap-3 border border-blood/40 bg-blood/5 px-4 py-3">
                  <p className="text-sm text-muted-foreground">Create a free account to chat in PepHub.</p>
                  <Link to="/auth" className="btn-blood hover:btn-blood-hover">Sign up free</Link>
                </div>
              )}
              {user && !profile && <ProfileSetup userId={user.id} onDone={setProfile} />}
              {user && profile && (
                <form onSubmit={send} className="flex items-end gap-2">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(e as unknown as React.FormEvent);
                      }
                    }}
                    rows={1}
                    maxLength={2000}
                    placeholder={`Message #${active.label}`}
                    className="max-h-32 min-h-[44px] flex-1 resize-none border border-foreground/20 bg-background px-4 py-3 text-sm focus:border-blood focus:outline-none"
                  />
                  <button
                    disabled={busy || !body.trim()}
                    className="btn-blood hover:btn-blood-hover flex h-[44px] w-[44px] items-center justify-center p-0 disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
              <p className="mt-2 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Educational talk only — no sourcing, sales, or medical advice.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ProfileSetup({ userId, onDone }: { userId: string; onDone: (p: PepProfile) => void }) {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const h = slugifyHandle(handle);
    if (h.length < 3) return toast.error("Handle must be at least 3 characters (letters, numbers, underscore).");
    if (!name.trim()) return toast.error("Add a display name.");
    setBusy(true);
    const { data, error } = await supabase
      .from("pephub_profiles")
      .insert({ user_id: userId, handle: h, display_name: name.trim() })
      .select("user_id, handle, display_name, bio, created_at")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "That handle is taken." : error.message);
    toast.success("You're in.");
    onDone(data as PepProfile);
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2 border border-blood/40 bg-blood/5 p-3">
      <div className="w-full font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Pick a name to start chatting
      </div>
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="handle"
        className="min-w-[140px] flex-1 border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-blood focus:outline-none"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Display name"
        className="min-w-[140px] flex-1 border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-blood focus:outline-none"
      />
      <button disabled={busy} className="btn-blood hover:btn-blood-hover">{busy ? "Saving…" : "Join chat"}</button>
    </form>
  );
}
