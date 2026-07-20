import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { recordReferral } from "@/lib/affiliates.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Titan Elite" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { user, role } = useAuth();
  const recordRef = useServerFn(recordReferral);

  if (user) {
    nav({ to: role === "admin" ? "/admin" : "/dashboard" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        // Attribute affiliate referral if a code was captured
        try {
          const ref = typeof window !== "undefined" ? localStorage.getItem("titan_ref_code") : null;
          if (ref) {
            await recordRef({ data: { code: ref } });
            localStorage.removeItem("titan_ref_code");
          }
        } catch { /* ignore */ }
        toast.success("Account created. You're signed in.");
        nav({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        nav({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auth failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SiteHeader />
      <section className="container-edge py-20 flex-1 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="text-eyebrow">Account</div>
          <h1 className="mt-4 text-5xl lg:text-7xl">{mode === "signin" ? "Sign in." : "Create account."}</h1>
          <p className="mt-4 text-muted-foreground max-w-md">
            {mode === "signin"
              ? "Access your client dashboard, protocols and coach messaging."
              : "Set up your account to submit intake and receive your custom protocols."}
          </p>
          <p className="mt-6 text-sm">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-blood font-mono uppercase tracking-[0.14em] text-xs hover:underline"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
        <form onSubmit={submit} className="lg:col-span-7 max-w-md space-y-5">
          {mode === "signup" && (
            <Field label="Full Name" value={name} onChange={setName} required />
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password" type="password" value={password} onChange={setPassword} required minLength={6} />
          <button disabled={busy} className="btn-blood hover:btn-blood-hover w-full">
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <p className="text-xs text-muted-foreground">
            By continuing you agree to the{" "}
            <Link to="/terms" className="underline">Terms</Link>,{" "}
            <Link to="/privacy" className="underline">Privacy Policy</Link> and{" "}
            <Link to="/disclaimer" className="underline">Disclaimer</Link>.
          </p>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, minLength }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; minLength?: number }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}{required && " *"}</label>
      <input
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood transition"
      />
    </div>
  );
}
