import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArrowLeft, ArrowRight, Check, Upload, Lock } from "lucide-react";

export const Route = createFileRoute("/intake")({
  head: () => ({
    meta: [
      { title: "Client Intake — Titan Elite" },
      { name: "description", content: "Submit your detailed intake for Titan Elite coaching." },
    ],
  }),
  component: Intake,
});

type Form = {
  age: string; height: string; weight: string; gender: string;
  fitness_experience: string; current_program: string; current_supplements: string;
  current_medications: string; injury_history: string; health_conditions: string;
  weightlifting_goals: string; strength_goals: string; muscle_gain_goals: string;
  fat_loss_goals: string; peptide_experience: string; peptides_of_interest: string;
  lifestyle: string; sleep_habits: string; nutrition_habits: string;
  consent_health: boolean; consent_disclaimer: boolean;
};

const initial: Form = {
  age: "", height: "", weight: "", gender: "",
  fitness_experience: "", current_program: "", current_supplements: "",
  current_medications: "", injury_history: "", health_conditions: "",
  weightlifting_goals: "", strength_goals: "", muscle_gain_goals: "",
  fat_loss_goals: "", peptide_experience: "", peptides_of_interest: "",
  lifestyle: "", sleep_habits: "", nutrition_habits: "",
  consent_health: false, consent_disclaimer: false,
};

function Intake() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(initial);
  const [photos, setPhotos] = useState<File[]>([]);
  const [labs, setLabs] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasPurchase, setHasPurchase] = useState<boolean | null>(null);
  const [checkingPurchase, setCheckingPurchase] = useState(true);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) {
      setCheckingPurchase(false);
      return;
    }
    const uid = user.id;
    async function checkPurchase() {
      try {
        const { data } = await supabase
          .from("purchases")
          .select("id")
          .eq("user_id", uid)
          .eq("status", "paid")
          .limit(1)
          .single();
        setHasPurchase(!!data);
      } catch {
        setHasPurchase(false);
      } finally {
        setCheckingPurchase(false);
      }
    }
    checkPurchase();
  }, [user]);

  const steps = ["Basics", "Training", "Health", "Goals", "Peptides", "Lifestyle", "Upload & Consent"];

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <section className="container-edge py-20 text-center max-w-xl mx-auto">
          <div className="text-eyebrow">Intake</div>
          <h1 className="mt-4 text-5xl">Create an account to begin.</h1>
          <p className="mt-4 text-muted-foreground">Your intake is saved to your private client dashboard for review.</p>
          <button onClick={() => nav({ to: "/auth" })} className="mt-8 btn-blood hover:btn-blood-hover">Create account / Sign in</button>
        </section>
        <SiteFooter />
      </div>
    );
  }

  if (checkingPurchase) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <section className="container-edge py-20 text-center max-w-xl mx-auto">
          <div className="text-eyebrow">Intake</div>
          <h1 className="mt-4 text-5xl">Checking your account…</h1>
        </section>
        <SiteFooter />
      </div>
    );
  }

  if (!hasPurchase) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <section className="container-edge py-20 text-center max-w-xl mx-auto">
          <Lock className="mx-auto text-blood" size={40} />
          <div className="text-eyebrow mt-6">Intake</div>
          <h1 className="mt-4 text-5xl">Purchase required.</h1>
          <p className="mt-4 text-muted-foreground">
            To submit your intake and receive a custom protocol, you must first purchase a coaching package.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link to="/pricing" className="btn-blood hover:btn-blood-hover">View Pricing</Link>
            <Link to="/checkout" className="btn-ghost">Go to Checkout</Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  async function uploadFiles(files: File[], folder: string): Promise<string[]> {
    const out: string[] = [];
    for (const f of files) {
      const path = `${user!.id}/${folder}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("client-uploads").upload(path, f);
      if (error) throw error;
      out.push(path);
    }
    return out;
  }

  async function submit() {
    if (!form.consent_health || !form.consent_disclaimer) {
      toast.error("You must accept the health consent and disclaimer to submit.");
      return;
    }
    setSubmitting(true);
    try {
      const photo_urls = await uploadFiles(photos, "photos");
      const lab_urls = await uploadFiles(labs, "labs");
      const { error } = await supabase.from("intakes").insert({
        user_id: user!.id,
        age: form.age ? parseInt(form.age) : null,
        height: form.height,
        weight: form.weight,
        gender: form.gender,
        fitness_experience: form.fitness_experience,
        current_program: form.current_program,
        current_supplements: form.current_supplements,
        current_medications: form.current_medications,
        injury_history: form.injury_history,
        health_conditions: form.health_conditions,
        weightlifting_goals: form.weightlifting_goals,
        strength_goals: form.strength_goals,
        muscle_gain_goals: form.muscle_gain_goals,
        fat_loss_goals: form.fat_loss_goals,
        peptide_experience: form.peptide_experience,
        peptides_of_interest: form.peptides_of_interest,
        lifestyle: form.lifestyle,
        sleep_habits: form.sleep_habits,
        nutrition_habits: form.nutrition_habits,
        progress_photo_urls: photo_urls,
        lab_work_urls: lab_urls,
        consent_health: form.consent_health,
        consent_disclaimer: form.consent_disclaimer,
      });
      if (error) throw error;
      toast.success("Intake submitted. Heading to your dashboard.");
      nav({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-16">
        <div className="text-eyebrow">Intake — Step {step + 1} / {steps.length}</div>
        <h1 className="mt-4 text-4xl lg:text-6xl">{steps[step]}</h1>

        <div className="mt-8 flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 ${i <= step ? "bg-blood" : "bg-foreground/15"}`} />
          ))}
        </div>

        <div className="mt-12 max-w-3xl space-y-6">
          {step === 0 && (
            <>
              <Row><Field label="Age" value={form.age} onChange={(v) => set("age", v)} type="number" /><Field label="Gender" value={form.gender} onChange={(v) => set("gender", v)} /></Row>
              <Row><Field label={`Height (e.g. 5'10")`} value={form.height} onChange={(v) => set("height", v)} /><Field label="Weight (lbs or kg)" value={form.weight} onChange={(v) => set("weight", v)} /></Row>
            </>
          )}
          {step === 1 && (
            <>
              <Area label="Fitness Experience" value={form.fitness_experience} onChange={(v) => set("fitness_experience", v)} placeholder="Training age, types of training, sports background…" />
              <Area label="Current Training Program" value={form.current_program} onChange={(v) => set("current_program", v)} placeholder="Days/week, split, current lifts and intensity…" />
            </>
          )}
          {step === 2 && (
            <>
              <Area label="Current Supplements" value={form.current_supplements} onChange={(v) => set("current_supplements", v)} />
              <Area label="Current Medications" value={form.current_medications} onChange={(v) => set("current_medications", v)} />
              <Area label="Injury History" value={form.injury_history} onChange={(v) => set("injury_history", v)} placeholder="Past injuries, surgeries, current limitations…" />
              <Area label="Health Conditions" value={form.health_conditions} onChange={(v) => set("health_conditions", v)} />
            </>
          )}
          {step === 3 && (
            <>
              <Area label="Weightlifting Goals" value={form.weightlifting_goals} onChange={(v) => set("weightlifting_goals", v)} />
              <Area label="Strength Goals" value={form.strength_goals} onChange={(v) => set("strength_goals", v)} placeholder="Target lifts and timelines…" />
              <Area label="Muscle Gain Goals" value={form.muscle_gain_goals} onChange={(v) => set("muscle_gain_goals", v)} />
              <Area label="Fat Loss Goals" value={form.fat_loss_goals} onChange={(v) => set("fat_loss_goals", v)} />
            </>
          )}
          {step === 4 && (
            <>
              <div className="border-l-2 border-blood pl-4 py-2 bg-muted text-sm text-muted-foreground">
                Reminder: Titan Elite provides peptide information for educational purposes only.
                We do not prescribe, sell, or distribute peptides.
              </div>
              <Area label="Peptide Experience" value={form.peptide_experience} onChange={(v) => set("peptide_experience", v)} placeholder="Past peptide use, cycles, dosing protocols you've followed…" />
              <Area label="Peptides of Interest" value={form.peptides_of_interest} onChange={(v) => set("peptides_of_interest", v)} placeholder="Which peptides you'd like educational information about…" />
            </>
          )}
          {step === 5 && (
            <>
              <Area label="Lifestyle Information" value={form.lifestyle} onChange={(v) => set("lifestyle", v)} placeholder="Job, stress level, schedule, travel…" />
              <Area label="Sleep Habits" value={form.sleep_habits} onChange={(v) => set("sleep_habits", v)} placeholder="Hours, quality, schedule consistency…" />
              <Area label="Nutrition Habits" value={form.nutrition_habits} onChange={(v) => set("nutrition_habits", v)} placeholder="Typical day of eating, tracking, restrictions…" />
            </>
          )}
          {step === 6 && (
            <>
              <FileBlock label="Progress Photos (front / side / back recommended)" files={photos} onChange={setPhotos} accept="image/*" />
              <FileBlock label="Lab Work (optional, PDF or image)" files={labs} onChange={setLabs} accept="image/*,application/pdf" />
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.consent_health} onChange={(e) => set("consent_health", e.target.checked)} className="mt-1 accent-blood" />
                <span className="text-sm">I consent to Titan Elite collecting and storing the health information I've shared for the purpose of building my custom coaching protocols, and I confirm I'm at least 18 years old.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.consent_disclaimer} onChange={(e) => set("consent_disclaimer", e.target.checked)} className="mt-1 accent-blood" />
                <span className="text-sm">I've read and accept the <a href="/disclaimer" target="_blank" className="underline">Disclaimer</a>, <a href="/terms" target="_blank" className="underline">Terms</a>, and <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>. I understand peptide information is educational only, and I assume all risk of training.</span>
              </label>
            </>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-foreground/10 pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost disabled:opacity-30"
          >
            <ArrowLeft size={14} /> Back
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-blood hover:btn-blood-hover">
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="btn-blood hover:btn-blood-hover">
              {submitting ? "Submitting…" : <>Submit Intake <Check size={14} /></>}
            </button>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-5">{children}</div>;
}
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood" />
    </div>
  );
}
function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}</label>
      <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood" />
    </div>
  );
}
function FileBlock({ label, files, onChange, accept }: { label: string; files: File[]; onChange: (f: File[]) => void; accept: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}</label>
      <label className="border-2 border-dashed border-foreground/20 p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-blood transition">
        <Upload size={20} className="text-blood" />
        <span className="text-sm">{files.length ? `${files.length} file(s) selected` : "Click to upload"}</span>
        <input type="file" multiple accept={accept} className="hidden" onChange={(e) => onChange(Array.from(e.target.files ?? []))} />
      </label>
    </div>
  );
}
