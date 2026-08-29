import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PostCard } from "@/components/pephub/PostCard";
import { followCounts, getProfileByHandle, listPosts, type PepPost, type PepProfile } from "@/lib/pephub";

export const Route = createFileRoute("/pephub/u/$handle")({
  head: () => ({
    meta: [
      { title: "Member profile — PepHub | Titan Elite" },
      { name: "description", content: "View a PepHub member's profile, posts about peptides and training, and follow their journey." },
      { property: "og:title", content: "Member profile — PepHub" },
      { property: "og:description", content: "View a PepHub member's posts and follow their peptide journey." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { handle } = useParams({ from: "/pephub/u/$handle" });
  const { user } = useAuth();
  const [profile, setProfile] = useState<PepProfile | null>(null);
  const [posts, setPosts] = useState<PepPost[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, isFollowing: false });
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const p = await getProfileByHandle(handle);
    setProfile(p);
    if (p) {
      setPosts(await listPosts(user?.id ?? null, { userId: p.user_id }));
      setStats(await followCounts(p.user_id, user?.id ?? null));
    }
    setReady(true);
  }, [handle, user]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    if (!user) return toast.error("Sign in to follow members.");
    if (!profile) return;
    if (stats.isFollowing) {
      await supabase.from("pephub_follows").delete().eq("follower_id", user.id).eq("following_id", profile.user_id);
    } else {
      const { error } = await supabase.from("pephub_follows").insert({ follower_id: user.id, following_id: profile.user_id });
      if (error) return toast.error(error.message);
    }
    load();
  }

  return (
    <div className="dark min-h-dvh bg-background text-foreground flex flex-col">
      <SiteHeader />
      <section className="container-edge flex-1 py-12">
        <Link to="/pephub" className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-blood transition">
          ← Back to PepHub
        </Link>

        {ready && !profile && <p className="mt-10 text-muted-foreground">No member found with that handle.</p>}

        {profile && (
          <>
            <div className="mt-6 flex flex-wrap items-start justify-between gap-6 border border-foreground/10 bg-card p-6">
              <div>
                <h1 className="font-heavy text-4xl">{profile.display_name}</h1>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">@{profile.handle}</div>
                {profile.bio && <p className="mt-4 max-w-xl font-body text-sm text-muted-foreground">{profile.bio}</p>}
                <div className="mt-5 flex gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span><span className="text-blood">{stats.followers}</span> followers</span>
                  <span><span className="text-blood">{stats.following}</span> following</span>
                  <span><span className="text-blood">{posts.length}</span> posts</span>
                </div>
              </div>
              {user?.id !== profile.user_id && (
                <button onClick={toggleFollow} className={stats.isFollowing ? "btn-ghost" : "btn-blood hover:btn-blood-hover"}>
                  {stats.isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>

            <div className="mt-8 space-y-6">
              {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
              {posts.map((p) => (
                <PostCard key={p.id} post={p} viewerId={user?.id ?? null} onChanged={load} />
              ))}
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
