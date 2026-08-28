import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set your password — Titan Elite" },
      { name: "description", content: "Create or reset the password for your Titan Elite dashboard account." },
      { property: "og:title", content: "Set your password — Titan Elite" },
      { property: "og:description", content: "Create or reset the password for your Titan Elite dashboard account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password set. Welcome in.");
      nav({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SiteHeader />
      <section className="container-edge py-20 flex-1">
        <div className="text-eyebrow">Account</div>
        <h1 className="mt-4 text-5xl lg:text-6xl">Set your password.</h1>
        {!ready ? (
          <p className="mt-6 text-muted-foreground max-w-md">
            Open this page from the link in your email. If the link expired, request a new
            one from the sign-in page.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 max-w-md space-y-5">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">New password *</label>
              <input
                type="password" value={password} required minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood transition"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">Confirm password *</label>
              <input
                type="password" value={confirm} required minLength={6}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood transition"
              />
            </div>
            <button disabled={busy} className="btn-blood hover:btn-blood-hover w-full">
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
