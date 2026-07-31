import { useMemo, useState } from "react";
import { Search, X, ExternalLink, FileText, ChevronRight } from "lucide-react";
import {
  PEPTIDE_LIBRARY,
  PEPTIDE_CATEGORIES,
  PEPTIDE_GENERAL_SOURCES,
  type PeptideEntry,
} from "@/lib/peptide-library";

/** Unbranded research vial illustration — no vendor labels. */
function Vial({ label }: { label: string }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-muted flex items-center justify-center">
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
      <svg viewBox="0 0 120 160" className="relative h-[78%] w-auto" role="img" aria-label={`${label} research vial illustration`}>
        <defs>
          <linearGradient id="glassG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="35%" stopColor="currentColor" stopOpacity="0.04" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.14" />
          </linearGradient>
        </defs>
        <g className="text-foreground">
          {/* cap */}
          <rect x="42" y="10" width="36" height="16" rx="2" className="fill-blood" />
          <rect x="46" y="26" width="28" height="7" rx="1" fill="currentColor" opacity="0.35" />
          {/* neck */}
          <rect x="50" y="33" width="20" height="9" fill="url(#glassG)" stroke="currentColor" strokeOpacity="0.28" />
          {/* body */}
          <rect x="32" y="42" width="56" height="104" rx="5" fill="url(#glassG)" stroke="currentColor" strokeOpacity="0.32" />
          {/* liquid */}
          <rect x="34" y="118" width="52" height="26" rx="4" className="fill-blood" opacity="0.18" />
          {/* label plate */}
          <rect x="38" y="62" width="44" height="42" fill="currentColor" opacity="0.05" stroke="currentColor" strokeOpacity="0.18" />
          <line x1="44" y1="94" x2="76" y2="94" stroke="currentColor" strokeOpacity="0.2" />
          <line x1="44" y1="99" x2="66" y2="99" stroke="currentColor" strokeOpacity="0.14" />
          {/* highlight */}
          <rect x="38" y="48" width="4" height="90" rx="2" fill="currentColor" opacity="0.1" />
        </g>
        <text
          x="60"
          y="82"
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontFamily: "var(--font-mono)", fontSize: label.length > 12 ? 7 : 9, letterSpacing: "0.06em" }}
        >
          {label.length > 16 ? `${label.slice(0, 15)}…` : label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

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
        <button onClick={onClose} aria-label="Close research detail" className="border border-foreground/15 p-2 hover:border-blood transition">
          <X size={14} />
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 p-5">
        <section>
          <h5 className="font-display text-lg mb-2">Molecular profile</h5>
          <div className="border border-foreground/10 px-4 py-1">
            <ProfileRow label="Class" value={p.compoundClass} />
            <ProfileRow label="Formula" value={p.molecularFormula} />
            <ProfileRow label="Mol. weight" value={p.molecularWeight} />
            <ProfileRow label="Sequence" value={p.sequence} />
            <ProfileRow label="Target" value={p.target} />
            <ProfileRow label="Half-life" value={p.halfLife} />
          </div>

          {p.contains && p.contains.length > 0 && (
            <div className="mt-5">
              <h5 className="font-display text-lg mb-2">What's in it</h5>
              <ul className="space-y-1.5">
                {p.contains.map((c) => (
                  <li key={c} className="text-sm flex gap-2">
                    <span className="text-blood font-mono text-[10px] pt-1">■</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div>
            <h5 className="font-display text-lg mb-2">What it's used for</h5>
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
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blood hover:underline inline-flex items-start gap-1.5">
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
      return [p.name, p.aka, p.researched, p.compoundClass, p.target, p.mechanism, p.category, ...(p.contains ?? [])]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(q));
    });
  }, [query, category]);

  const active = selected ? PEPTIDE_LIBRARY.find((p) => p.name === selected) ?? null : null;

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-3xl sm:text-5xl">Peptide Research</h3>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
          Explore scientific studies and clinical data on each compound — molecular profile, what's in it, and what it's researched
          for. Educational reference only; not medical advice.
        </p>
      </div>

      <div className="relative w-full max-w-2xl mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search compounds…"
          className="w-full bg-background border border-foreground/15 rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blood"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["All", ...PEPTIDE_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border transition ${
              category === c ? "border-blood bg-blood text-primary-foreground" : "border-foreground/15 text-muted-foreground hover:border-blood"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {active && (
        <div className="mb-6">
          <PeptideDetail p={active} onClose={() => setSelected(null)} />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <article
            key={p.name}
            className={`border flex flex-col transition ${selected === p.name ? "border-blood" : "border-foreground/10 hover:border-blood"}`}
          >
            <Vial label={p.name} />
            <div className="p-4 flex flex-col gap-1 grow">
              <h4 className="font-display text-lg leading-tight">{p.name}</h4>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{p.category}</p>
            </div>
            <div className="p-4 pt-0">
              <button
                onClick={() => setSelected(selected === p.name ? null : p.name)}
                className="w-full bg-secondary text-secondary-foreground hover:bg-blood hover:text-primary-foreground transition font-mono text-[10px] uppercase tracking-[0.16em] py-3 px-2 flex items-center justify-center gap-2"
              >
                <FileText size={13} /> View research
              </button>
            </div>
          </article>
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
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blood hover:underline inline-flex items-center gap-1.5">
                <ExternalLink size={13} /> {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
