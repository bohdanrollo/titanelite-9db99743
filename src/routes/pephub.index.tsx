import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PostCard } from "@/components/pephub/PostCard";
import { getMyProfile, listPosts, slugifyHandle, type PepPost, type PepProfile } from "@/lib/pephub";

export const Route = createFileRoute("/pephub/")({
  head: () => ({
    meta: [
      { title: "PepHub — Free Peptide Community | Titan Elite" },
      { name: "description", content: "PepHub is a free community to post about peptides, share your journey, comment, like, and follow other members. Create a profile and join the conversation." },
      { property: "og:title", content: "PepHub — Free Peptide Community" },
      { property: "og:description", content: "Post about peptides, share your journey, comment, like and follow other members. Free to join." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PepHub,
});

function PepHub() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<PepProfile | null>(null);
  const [posts, setPosts] = useState<PepPost[]>([]);
  const [tab, setTab] = useState<"all" | "following">("all");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await listPosts(user?.id ?? null, tab === "following" && user ? { followingOf: user.id } : undefined);
    setPosts(rows);
    setReady(true);
  }, [user, tab]);

  useEffect(() => {
    if (loading) return;
    if (user) getMyProfile(user.id).then(setProfile);
    else setProfile(null);
    refresh();
  }, [user, loading, refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("pephub_posts").insert({ user_id: user.id, body: body.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
    refresh();
  }

  return (
    <div className="dark min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />
      <section className="border-b border-border">
        <div className="container-edge py-14">
          <div className="text-eyebrow">Free community</div>
          <h1 className="mt-4 font-heavy text-5xl lg:text-7xl leading-[0.9]">
            Pep<span className="text-blood">Hub</span>
          </h1>
          <p className="mt-5 max-w-xl font-body text-muted-foreground">
            Post about peptides, share your journey, ask questions, and follow the people whose
            progress you want to watch. Free for everyone — no subscription required.
          </p>
        </div>
      </section>

      <section className="container-edge grid gap-10 py-12 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {!user && (
            <div className="border border-blood/40 bg-blood/5 p-6">
              <div className="font-heavy text-xl">Join the conversation</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a free account to post, comment, like, and follow members.
              </p>
              <Link to="/auth" className="btn-blood hover:btn-blood-hover mt-5 inline-flex">Sign up free</Link>
            </div>
          )}

          {user && !profile && <ProfileSetup userId={user.id} onDone={setProfile} />}

          {user && profile && (
            <form onSubmit={submit} className="border border-foreground/10 bg-card p-5">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="What's happening in your journey?"
                className="w-full resize-none border border-foreground/20 bg-background px-4 py-3 text-sm focus:border-blood focus:outline-none"
              />
              <div className="mt-3 flex justify-end">
                <button disabled={busy} className="btn-blood hover:btn-blood-hover">
                  {busy ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          )}

          <div className="flex gap-6 border-b border-foreground/10 pb-3">
            {(["all", "following"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`font-mono text-[11px] uppercase tracking-[0.18em] transition ${tab === t ? "text-blood" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "all" ? "Latest" : "Following"}
              </button>
            ))}
          </div>

          {!ready && <p className="text-sm text-muted-foreground">Loading…</p>}
          {ready && posts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {tab === "following" ? "Follow some members to see their posts here." : "No posts yet — be the first."}
            </p>
          )}
          {posts.map((p) => (
            <PostCard key={p.id} post={p} viewerId={user?.id ?? null} onChanged={refresh} />
          ))}
        </div>

        <aside className="lg:col-span-4 space-y-6">
          {profile && (
            <div className="border border-foreground/10 bg-card p-5">
              <div className="text-eyebrow">Your profile</div>
              <div className="mt-3 font-heavy text-xl">{profile.display_name}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">@{profile.handle}</div>
              <Link
                to="/pephub/u/$handle"
                params={{ handle: profile.handle }}
                className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-blood hover:underline"
              >
                View profile
              </Link>
            </div>
          )}
          <div className="border border-foreground/10 bg-card p-5">
            <div className="text-eyebrow">Community rules</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Educational discussion only — no sourcing or sales.</li>
              <li>Share your own experience, not medical advice.</li>
              <li>Be respectful. Harassment gets you removed.</li>
            </ul>
          </div>
        </aside>
      </section>
      <SiteFooter />
    </div>
  );
}

function ProfileSetup({ userId, onDone }: { userId: string; onDone: (p: PepProfile) => void }) {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const h = slugifyHandle(handle);
    if (h.length < 3) return toast.error("Handle must be at least 3 characters (letters, numbers, underscore).");
    if (!name.trim()) return toast.error("Add a display name.");
    setBusy(true);
    const { data, error } = await supabase
      .from("pephub_profiles")
      .insert({ user_id: userId, handle: h, display_name: name.trim(), bio: bio.trim() || null })
      .select("user_id, handle, display_name, bio, created_at")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "That handle is taken." : error.message);
    toast.success("Profile created.");
    onDone(data as PepProfile);
  }

  return (
    <form onSubmit={save} className="border border-blood/40 bg-blood/5 p-6 space-y-4">
      <div>
        <div className="font-heavy text-xl">Create your PepHub profile</div>
        <p className="mt-1 text-sm text-muted-foreground">One-time setup so members know who you are.</p>
      </div>
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="handle (e.g. ironmike)"
        className="w-full border border-foreground/20 bg-background px-4 py-3 text-sm focus:border-blood focus:outline-none"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Display name"
        className="w-full border border-foreground/20 bg-background px-4 py-3 text-sm focus:border-blood focus:outline-none"
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        placeholder="Short bio (optional)"
        className="w-full resize-none border border-foreground/20 bg-background px-4 py-3 text-sm focus:border-blood focus:outline-none"
      />
      <button disabled={busy} className="btn-blood hover:btn-blood-hover">{busy ? "Saving…" : "Create profile"}</button>
    </form>
  );
}
