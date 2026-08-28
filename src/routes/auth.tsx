import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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
        // Referral codes are kept in localStorage and only credited to the
        // affiliate once the client actually pays for a plan (at checkout).
        toast.success("Account created. You're signed in.");
        nav({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        nav({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Auth failed";
      const lower = raw.toLowerCase();
      let msg = raw;
      if (lower.includes("email not confirmed")) {
        msg = "Your email isn't confirmed yet. Try again in a moment — if it keeps failing, contact support.";
      } else if (lower.includes("invalid login credentials")) {
        msg = "Incorrect email or password. Check for typos or create an account.";
      } else if (lower.includes("already registered") || lower.includes("user already")) {
        msg = "An account with that email already exists — sign in instead.";
      }
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
          {mode === "signin" && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!email) return toast.error("Enter your email first.");
                setBusy(true);
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) throw error;
                  toast.success("Check your email for a link to set your password.");
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Could not send email");
                } finally {
                  setBusy(false);
                }
              }}
              className="text-blood font-mono uppercase tracking-[0.14em] text-xs hover:underline"
            >
              Set / reset password
            </button>
          )}
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
