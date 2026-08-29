import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listComments, type PepPost, type PepProfile } from "@/lib/pephub";

type Comment = { id: string; user_id: string; body: string; created_at: string; author?: PepProfile };

export function PostCard({
  post,
  viewerId,
  onChanged,
}: {
  post: PepPost;
  viewerId: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    if (!viewerId) return toast.error("Sign in to like posts.");
    if (post.liked) {
      await supabase.from("pephub_likes").delete().eq("post_id", post.id).eq("user_id", viewerId);
    } else {
      await supabase.from("pephub_likes").insert({ post_id: post.id, user_id: viewerId });
    }
    onChanged();
  }

  async function openComments() {
    const next = !open;
    setOpen(next);
    if (next) setComments((await listComments(post.id)) as Comment[]);
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!viewerId) return toast.error("Sign in to comment.");
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("pephub_comments")
      .insert({ post_id: post.id, user_id: viewerId, body: text.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText("");
    setComments((await listComments(post.id)) as Comment[]);
    onChanged();
  }

  async function removePost() {
    if (!confirm("Delete this post?")) return;
    await supabase.from("pephub_posts").delete().eq("id", post.id);
    onChanged();
  }

  const handle = post.author?.handle ?? "member";

  return (
    <article className="border border-foreground/10 bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center bg-blood/15 text-blood font-mono text-xs uppercase">
            {(post.author?.display_name ?? "?").slice(0, 2)}
          </div>
          <div>
            <Link
              to="/pephub/u/$handle"
              params={{ handle }}
              className="font-heavy text-sm hover:text-blood transition"
            >
              {post.author?.display_name ?? "Member"}
            </Link>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              @{handle} · {new Date(post.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        {viewerId === post.user_id && (
          <button onClick={removePost} className="text-muted-foreground hover:text-blood transition" aria-label="Delete post">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <p className="mt-4 whitespace-pre-wrap font-body text-sm leading-relaxed">{post.body}</p>

      <div className="mt-4 flex items-center gap-6">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] transition ${post.liked ? "text-blood" : "text-muted-foreground hover:text-blood"}`}
        >
          <Heart size={14} fill={post.liked ? "currentColor" : "none"} /> {post.likes}
        </button>
        <button
          onClick={openComments}
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-blood transition"
        >
          <MessageCircle size={14} /> {post.comments}
        </button>
      </div>

      {open && (
        <div className="mt-5 space-y-4 border-t border-foreground/10 pt-4">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <Link
                to="/pephub/u/$handle"
                params={{ handle: c.author?.handle ?? "member" }}
                className="font-heavy text-xs hover:text-blood transition"
              >
                {c.author?.display_name ?? "Member"}
              </Link>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          <form onSubmit={addComment} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={viewerId ? "Add a comment…" : "Sign in to comment"}
              className="flex-1 border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-blood focus:outline-none"
            />
            <button disabled={busy} className="btn-blood hover:btn-blood-hover">Post</button>
          </form>
        </div>
      )}
    </article>
  );
}
