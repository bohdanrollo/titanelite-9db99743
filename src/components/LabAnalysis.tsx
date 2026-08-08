import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getLabAnalysis, saveAndAnalyzeLabs, type LabAnalysisRow } from "@/lib/labs.functions";
import { Upload, Loader2, Activity, RefreshCw, FileText } from "lucide-react";

export default function LabAnalysis() {
  const { user } = useAuth();
  const load = useServerFn(getLabAnalysis);
  const analyze = useServerFn(saveAndAnalyzeLabs);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [row, setRow] = useState<LabAnalysisRow | null>(null);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    let cancelled = false;
    load({})
      .then((r) => {
        if (cancelled) return;
        setRow(r);
        if (r) {
          setAge(r.age != null ? String(r.age) : "");
          setSex(r.sex ?? "");
          setHeight(r.height ?? "");
          setWeight(r.weight ?? "");
          setNotes(r.notes ?? "");
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  async function run() {
    if (!user) return;
    if (!files.length && !(row?.file_paths?.length)) {
      toast.error("Upload at least one blood panel file first.");
      return;
    }
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const f of files) {
        const path = `${user.id}/labs/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("client-uploads").upload(path, f);
        if (error) throw error;
        uploaded.push(path);
      }
      const saved = await analyze({
        data: { age, sex, height, weight, notes, file_paths: uploaded },
      });
      setRow(saved);
      setFiles([]);
      toast.success("Analysis updated.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-eyebrow">Loading your lab results…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl">Lab Analysis</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Upload your blood test panel and add your stats. You'll get a breakdown of what's outside optimal range and
          practical ways to improve it. Your results save here — update or re-upload anytime. Educational only, not medical advice.
        </p>
      </div>

      <div className="border border-foreground/15 p-5 sm:p-6 space-y-5">
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Age" value={age} onChange={setAge} type="number" />
          <Field label="Sex" value={sex} onChange={setSex} placeholder="Male / Female" />
          <Field label="Height" value={height} onChange={setHeight} placeholder={`5'10"`} />
          <Field label="Weight" value={weight} onChange={setWeight} placeholder="185 lbs" />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">
            Notes, symptoms, or goals (optional)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">
            Blood panel files (PDF or image)
          </label>
          <label className="border-2 border-dashed border-foreground/20 p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-blood transition">
            <Upload size={20} className="text-blood" />
            <span className="text-sm">
              {files.length ? `${files.length} file(s) ready` : "Click to upload your panel"}
            </span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {!!row?.file_paths?.length && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <FileText size={12} /> {row.file_paths.length} file(s) already saved. Uploading new files replaces them for the next analysis.
            </p>
          )}
        </div>
        <button onClick={run} disabled={busy} className="btn-blood hover:btn-blood-hover">
          {busy ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : row?.analysis ? <><RefreshCw size={14} /> Re-analyze</> : <><Activity size={14} /> Analyze my panel</>}
        </button>
      </div>

      {row?.analysis && (
        <div className="border border-foreground/15 p-5 sm:p-6">
          <div className="text-eyebrow">
            Your results{row.analyzed_at ? ` — updated ${new Date(row.analyzed_at).toLocaleDateString()}` : ""}
          </div>
          <div className="mt-4 prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-table:text-sm">
            <ReactMarkdown>{row.analysis}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood"
      />
    </div>
  );
}
