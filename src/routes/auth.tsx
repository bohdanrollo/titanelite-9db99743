import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SignupAcknowledgements } from "@/components/SignupAcknowledgements";
import { SignupContactConsent } from "@/components/SignupContactConsent";
import { signupSchema, signupMetadata, friendlyErrorMessage } from "@/lib/signup-schema";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — PepLog" },
    { name: "description", content: "Sign in or create your PepLog account." },
    { property: "og:title", content: "Sign in — PepLog" },
    { property: "og:description", content: "Sign in or create your PepLog account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [age21, setAge21] = useState(false);
  const [researchUse, setResearchUse] = useState(false);
  const [phone, setPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const nav = useNavigate();
  const { user, role } = useAuth();
  const sendWelcome = useServerFn(sendWelcomeEmail);

  useEffect(() => {
    if (user) void nav({ to: role === "admin" ? "/admin" : "/dashboard" });
  }, [user, role, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && (!age21 || !researchUse)) {
      toast.error("Please check both confirmation boxes to create your account.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.parse({ name, email, password, phone, marketingConsent, age21, researchUse });
        const { data, error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            data: signupMetadata(parsed),
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmationSent(true);
          toast.success("Check your email to confirm your account. Basic Access is free.");
          return;
        }
        // Referral codes are kept in localStorage and only credited to the
        // affiliate once the client actually pays for a plan (at checkout).
        try {
          await sendWelcome({ data: { name, age21: true, researchUse: true } });
        } catch (mailErr) {
          console.warn("[welcome] send failed", mailErr);
        }
        toast.success("Account created. You're signed in.");
        nav({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        nav({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const raw = friendlyErrorMessage(err, "Auth failed");
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
              : "Create your free Basic account for research, tracking and calculators. AI tools and coaching are available with paid upgrades."}
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
          <Field label="Password" type="password" value={password} onChange={setPassword} required minLength={mode === "signup" ? 8 : 6} />
          {mode === "signup" && <SignupContactConsent idPrefix="auth-signup" phone={phone} onPhone={setPhone} consent={marketingConsent} onConsent={setMarketingConsent} />}
          {mode === "signup" && (
            <SignupAcknowledgements
              idPrefix="auth-signup"
              age21={age21}
              researchUse={researchUse}
              onAge21={setAge21}
              onResearchUse={setResearchUse}
            />
          )}
          {confirmationSent && <p role="status" className="text-sm text-primary">Check your email to confirm your account, then sign in for free Basic Access.</p>}
          <Button
            disabled={busy || (mode === "signup" && (!age21 || !researchUse || !marketingConsent))}
            className="btn-blood hover:btn-blood-hover w-full disabled:opacity-50"
          >
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
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
      <label htmlFor={`auth-${type}-${label.replace(/\s/g, "").toLowerCase()}`} className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}{required && " *"}</label>
      <input
        id={`auth-${type}-${label.replace(/\s/g, "").toLowerCase()}`}
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
