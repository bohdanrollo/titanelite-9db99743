import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getProfileByHandle, type PepProfile } from "@/lib/pephub";

export const Route = createFileRoute("/pephub/u/$handle")({
  head: () => ({
    meta: [
      { title: "Member profile — PepHub Chat | Titan Elite" },
      { name: "description", content: "View a PepHub member's profile and their recent messages in the free peptide chat rooms." },
      { property: "og:title", content: "Member profile — PepHub Chat" },
      { property: "og:description", content: "See a PepHub member's recent chat messages and channels." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

type Msg = { id: string; body: string; created_at: string; channel: string };

function ProfilePage() {
  const { handle } = useParams({ from: "/pephub/u/$handle" });
  const [profile, setProfile] = useState<PepProfile | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const p = await getProfileByHandle(handle);
    setProfile(p);
    if (p) {
      const { data } = await supabase
        .from("pephub_posts")
        .select("id, body, created_at, channel")
        .eq("user_id", p.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      setMsgs((data ?? []) as Msg[]);
    }
    setReady(true);
  }, [handle]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />
      <section className="container-edge flex-1 py-12">
        <Link to="/pephub" className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-blood transition">
          ← Back to chat
        </Link>

        {ready && !profile && <p className="mt-10 text-muted-foreground">No member found with that handle.</p>}

        {profile && (
          <>
            <div className="mt-6 flex items-start gap-4 border border-foreground/10 bg-card p-6">
              <div className="flex h-14 w-14 items-center justify-center bg-blood/20 font-heavy text-xl text-blood">
                {profile.display_name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="font-heavy text-3xl">{profile.display_name}</h1>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">@{profile.handle}</div>
                {profile.bio && <p className="mt-3 max-w-xl font-body text-sm text-muted-foreground">{profile.bio}</p>}
              </div>
            </div>

            <div className="mt-8 border border-foreground/10 bg-card/40">
              <div className="border-b border-foreground/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Recent messages
              </div>
              {msgs.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">No messages yet.</p>}
              {msgs.map((m) => (
                <div key={m.id} className="border-b border-foreground/5 px-5 py-3 last:border-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                    #{m.channel} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">{m.body}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
