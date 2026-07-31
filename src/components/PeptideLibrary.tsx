import { useMemo, useState } from "react";
import { Search, X, ExternalLink, FlaskConical, ChevronRight } from "lucide-react";
import {
  PEPTIDE_LIBRARY,
  PEPTIDE_CATEGORIES,
  PEPTIDE_GENERAL_SOURCES,
  type PeptideEntry,
} from "@/lib/peptide-library";

function ProfileRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 border-b border-foreground/10 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground pt-0.5">{label}</span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}

function PeptideDetail({ p, onClose }: { p: PeptideEntry; onClose: () => void }) {
  return (
    <div className="border border-blood/40 bg-card">
      <div className="flex items-start justify-between gap-4 p-5 border-b border-foreground/10">
        <div>
          <p className="text-eyebrow">{p.category}</p>
          <h4 className="font-display text-2xl sm:text-3xl mt-1">{p.name}</h4>
          {p.aka && <p className="text-sm text-muted-foreground mt-1">Also known as {p.aka}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close compound detail"
          className="border border-foreground/15 p-2 hover:border-blood transition"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 p-5">
        <section>
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical size={14} className="text-blood" />
            <h5 className="font-display text-lg">Molecular profile</h5>
          </div>
          <div className="border border-foreground/10 px-4 py-1">
            <ProfileRow label="Class" value={p.compoundClass} />
            <ProfileRow label="Formula" value={p.molecularFormula} />
            <ProfileRow label="Mol. weight" value={p.molecularWeight} />
            <ProfileRow label="Sequence" value={p.sequence} />
            <ProfileRow label="Target" value={p.target} />
            <ProfileRow label="Half-life" value={p.halfLife} />
          </div>
          {!p.molecularFormula && !p.sequence && (
            <p className="text-xs text-muted-foreground mt-2">
              Full structural data is not standardized for this preparation — see class and target above.
            </p>
          )}
        </section>

        <section className="space-y-5">
          <div>
            <h5 className="font-display text-lg mb-2">What it is researched for</h5>
            <p className="text-sm text-muted-foreground">{p.researched}</p>
            {p.uses && p.uses.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {p.uses.map((u) => (
                  <li key={u} className="text-sm flex gap-2">
                    <ChevronRight size={14} className="text-blood shrink-0 mt-0.5" />
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {p.mechanism && (
            <div>
              <h5 className="font-display text-lg mb-2">Mechanism</h5>
              <p className="text-sm text-muted-foreground">{p.mechanism}</p>
            </div>
          )}

          <div>
            <h5 className="font-display text-lg mb-2">Sources</h5>
            <ul className="space-y-1.5">
              {(p.sources && p.sources.length > 0 ? p.sources : PEPTIDE_GENERAL_SOURCES.slice(0, 2)).map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blood hover:underline inline-flex items-start gap-1.5"
                  >
                    <ExternalLink size={13} className="shrink-0 mt-0.5" />
                    <span>{s.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PeptideLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PEPTIDE_LIBRARY.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (!q) return true;
      return [p.name, p.aka, p.researched, p.compoundClass, p.target, p.mechanism, p.category]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(q));
    });
  }, [query, category]);

  const active = selected ? PEPTIDE_LIBRARY.find((p) => p.name === selected) ?? null : null;

  return (
    <div>
      <div className="mb-6">
        <p className="text-eyebrow">Research Library</p>
        <h3 className="font-display text-2xl sm:text-3xl mt-1">Peptide Research</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          {PEPTIDE_LIBRARY.length} compounds with molecular profiles, mechanisms, and cited literature. For research and
          educational purposes only — not medical advice, and not for human or animal consumption.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search compounds, targets, mechanisms…"
            className="w-full bg-background border border-foreground/15 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blood"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", ...PEPTIDE_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border transition ${
                category === c
                  ? "border-blood bg-blood text-primary-foreground"
                  : "border-foreground/15 text-muted-foreground hover:border-blood"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="mb-6">
          <PeptideDetail p={active} onClose={() => setSelected(null)} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((p, i) => (
          <button
            key={p.name}
            onClick={() => setSelected(selected === p.name ? null : p.name)}
            className={`text-left border p-5 transition h-full ${
              selected === p.name ? "border-blood" : "border-foreground/10 hover:border-blood"
            }`}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h4 className="font-display text-xl">{p.name}</h4>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blood mt-1">{p.category}</p>
            <p className="text-sm text-muted-foreground mt-2">{p.researched}</p>
            <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em]">
              View profile <ChevronRight size={12} />
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full border border-foreground/10 p-6 text-sm text-muted-foreground text-center">
            No compounds found matching “{query}”.
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-foreground/10 pt-5">
        <p className="text-eyebrow">Reference databases</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
          {PEPTIDE_GENERAL_SOURCES.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blood hover:underline inline-flex items-center gap-1.5"
              >
                <ExternalLink size={13} /> {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
