import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { buildStack } from "@/lib/stack-builder.functions";

const GOALS = ["Fat loss", "Muscle growth", "Recovery & injury repair", "Anti-aging & longevity", "Sleep & GH support", "Performance & endurance"];

export default function StackBuilder() {
  const run = useServerFn(buildStack);
  const [goal, setGoal] = useState("");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!goal) {
      toast.error("Pick a goal first.");
      return;
    }
    setBusy(true);
    setResult("");
    try {
      const r = await run({ data: { goal, details } });
      setResult(r.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stack build failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-eyebrow">AI Stack Builder</div>
      <h2 className="mt-3 font-display text-3xl lg:text-4xl">Build a research stack.</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xl">
        Pick your goal, add context, and get an educational research-oriented stack with typical dosing, timing, and cycling guidance.
        Educational only — always consult a qualified physician.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-8 max-w-2xl">
        {GOALS.map((g) => (
          <button
            key={g}
            onClick={() => setGoal(g)}
            className={`border px-3 py-3 text-sm text-left transition ${goal === g ? "border-blood bg-blood/10 text-blood" : "border-foreground/15 hover:border-blood/50"}`}
          >
            {g}
          </button>
        ))}
      </div>

      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        placeholder="Context (optional): training experience, current stack, body weight, anything relevant…"
        className="stack-input mt-4 w-full max-w-2xl"
      />

      <button onClick={() => void submit()} disabled={busy} className="btn-blood hover:btn-blood-hover mt-4 flex items-center gap-2">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {busy ? "Building your stack…" : "Build my stack"}
      </button>

      {result && (
        <div className="mt-8 border border-foreground/15 p-5 sm:p-6 max-w-3xl prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
