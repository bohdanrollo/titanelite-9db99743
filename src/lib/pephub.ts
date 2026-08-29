import { supabase } from "@/integrations/supabase/client";

export type PepProfile = {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  created_at: string;
};

export type PepPost = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: PepProfile;
  likes: number;
  liked: boolean;
  comments: number;
};

export function slugifyHandle(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

export async function getMyProfile(userId: string) {
  const { data } = await supabase
    .from("pephub_profiles")
    .select("user_id, handle, display_name, bio, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as PepProfile | null) ?? null;
}

export async function getProfileByHandle(handle: string) {
  const { data } = await supabase
    .from("pephub_profiles")
    .select("user_id, handle, display_name, bio, created_at")
    .eq("handle", handle)
    .maybeSingle();
  return (data as PepProfile | null) ?? null;
}

async function decorate(rows: { id: string; user_id: string; body: string; created_at: string }[], viewerId: string | null): Promise<PepPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from("pephub_profiles").select("user_id, handle, display_name, bio, created_at").in("user_id", userIds),
    supabase.from("pephub_likes").select("post_id, user_id").in("post_id", ids),
    supabase.from("pephub_comments").select("post_id").in("post_id", ids),
  ]);

  const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p as PepProfile]));
  return rows.map((r) => {
    const postLikes = (likes ?? []).filter((l) => l.post_id === r.id);
    return {
      ...r,
      author: profMap.get(r.user_id),
      likes: postLikes.length,
      liked: !!viewerId && postLikes.some((l) => l.user_id === viewerId),
      comments: (comments ?? []).filter((c) => c.post_id === r.id).length,
    };
  });
}

export async function listPosts(viewerId: string | null, opts?: { userId?: string; followingOf?: string }) {
  let q = supabase.from("pephub_posts").select("id, user_id, body, created_at").order("created_at", { ascending: false }).limit(100);
  if (opts?.userId) q = q.eq("user_id", opts.userId);
  if (opts?.followingOf) {
    const { data: follows } = await supabase.from("pephub_follows").select("following_id").eq("follower_id", opts.followingOf);
    const ids = (follows ?? []).map((f) => f.following_id);
    if (ids.length === 0) return [];
    q = q.in("user_id", ids);
  }
  const { data } = await q;
  return decorate((data ?? []) as never, viewerId);
}

export async function listComments(postId: string) {
  const { data } = await supabase
    .from("pephub_comments")
    .select("id, post_id, user_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("pephub_profiles").select("user_id, handle, display_name, bio, created_at").in("user_id", userIds)
    : { data: [] };
  const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p as PepProfile]));
  return rows.map((r) => ({ ...r, author: profMap.get(r.user_id) }));
}

export async function followCounts(userId: string, viewerId: string | null) {
  const [{ data: followers }, { data: following }] = await Promise.all([
    supabase.from("pephub_follows").select("follower_id").eq("following_id", userId),
    supabase.from("pephub_follows").select("following_id").eq("follower_id", userId),
  ]);
  return {
    followers: followers?.length ?? 0,
    following: following?.length ?? 0,
    isFollowing: !!viewerId && (followers ?? []).some((f) => f.follower_id === viewerId),
  };
}
