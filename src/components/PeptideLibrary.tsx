import { useMemo, useState } from "react";
import { Search, X, FileText, ChevronRight } from "lucide-react";
import {
  PEPTIDE_LIBRARY,
  PEPTIDE_CATEGORIES,
  PEPTIDE_GENERAL_SOURCES,
  type PeptideEntry,
} from "@/lib/peptide-library";

/** Wrap a label into lines that fit the vial's label plate. */
function wrapLabel(label: string, maxChars: number, maxLines: number) {
  const words = label.toUpperCase().split(/[\s/]+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      if (w.length > maxChars) {
        // split long words across lines instead of truncating mid-word
        for (let i = 0; i < w.length; i += maxChars) {
          const chunk = w.slice(i, i + maxChars);
          if (i + maxChars < w.length) lines.push(chunk);
          else cur = chunk;
        }
        if (w.length % maxChars === 0) cur = "";
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    trimmed[maxLines - 1] = trimmed[maxLines - 1].slice(0, maxChars);
    return trimmed;
  }
  return lines;
}

/** Titan Elite–branded research vial illustration. */
function Vial({ label }: { label: string }) {
  const uid = label.replace(/[^a-zA-Z0-9]/g, "");
  const maxChars = 12;
  const lines = wrapLabel(label, maxChars, 2);
  const fontSize = lines.some((l) => l.length > 9) ? 6.6 : 7.8;
  const lineHeight = fontSize + 2.4;
  const nameStartY = 76 - ((lines.length - 1) * lineHeight) / 2;

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-muted flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      />
      {/* soft backdrop glow behind the vial */}
      <div
        className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--blood) 25%, transparent), transparent)" }}
      />
      <svg viewBox="0 0 120 168" className="relative h-[86%] w-auto drop-shadow-[0_10px_14px_rgba(0,0,0,0.25)]" role="img" aria-label={`Titan Elite ${label} research vial`}>
        <defs>
          {/* glass shading across the cylinder */}
          <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="8%" stopColor="#fff" stopOpacity="0.12" />
            <stop offset="30%" stopColor="#dfe9f2" stopOpacity="0.05" />
            <stop offset="55%" stopColor="#c8d6e2" stopOpacity="0.10" />
            <stop offset="80%" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="94%" stopColor="#8fa4b5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#5a6b7a" stopOpacity="0.28" />
          </linearGradient>
          {/* neck glass */}
          <linearGradient id={`neck-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#c8d6e2" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#5a6b7a" stopOpacity="0.25" />
          </linearGradient>
          {/* metallic aluminum crimp cap */}
          <linearGradient id={`cap-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5c5f66" />
            <stop offset="12%" stopColor="#e8eaee" />
            <stop offset="28%" stopColor="#b7bac2" />
            <stop offset="48%" stopColor="#7d8088" />
            <stop offset="70%" stopColor="#c9ccd2" />
            <stop offset="88%" stopColor="#9b9ea6" />
            <stop offset="100%" stopColor="#4a4d54" />
          </linearGradient>
          <linearGradient id={`capTop-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4f5f8" />
            <stop offset="100%" stopColor="#a9acb4" />
          </linearGradient>
          {/* red flip-off center */}
          <radialGradient id={`flip-${uid}`} cx="0.35" cy="0.3" r="0.9">
            <stop offset="0%" stopColor="oklch(0.68 0.2 27)" />
            <stop offset="70%" stopColor="oklch(0.5 0.21 27)" />
            <stop offset="100%" stopColor="oklch(0.38 0.18 27)" />
          </radialGradient>
          {/* clear solution */}
          <linearGradient id={`liq-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bcd6e6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#9db9cc" stopOpacity="0.55" />
          </linearGradient>
          {/* paper label */}
          <linearGradient id={`paper-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d9d2c4" />
            <stop offset="10%" stopColor="#fdfbf6" />
            <stop offset="50%" stopColor="#f6f2e9" />
            <stop offset="88%" stopColor="#efe9dc" />
            <stop offset="100%" stopColor="#cfc7b6" />
          </linearGradient>
          <clipPath id={`bodyClip-${uid}`}>
            <path d="M34 54 Q34 46 42 42 L42 40 L78 40 L78 42 Q86 46 86 54 L86 143 Q86 150 79 150 L41 150 Q34 150 34 143 Z" />
          </clipPath>
        </defs>

        {/* ground shadow */}
        <ellipse cx="60" cy="154" rx="26" ry="4.5" fill="#000" opacity="0.22" />
        <ellipse cx="60" cy="153" rx="18" ry="3" fill="#000" opacity="0.16" />

        {/* glass body with shoulders */}
        <path
          d="M34 54 Q34 46 42 42 L42 38 L78 38 L78 42 Q86 46 86 54 L86 143 Q86 150 79 150 L41 150 Q34 150 34 143 Z"
          fill={`url(#glass-${uid})`}
          stroke="#3d4a57"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        {/* thick glass base */}
        <g clipPath={`url(#bodyClip-${uid})`}>
          <rect x="34" y="140" width="52" height="10" fill="#8fa4b5" opacity="0.3" />
          <line x1="36" y1="141" x2="84" y2="141" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
        </g>

        {/* solution */}
        <g clipPath={`url(#bodyClip-${uid})`}>
          <path d="M34 108 Q60 103 86 108 L86 151 L34 151 Z" fill={`url(#liq-${uid})`} />
          <ellipse cx="60" cy="106" rx="26" ry="3.4" fill="#d9ecf7" opacity="0.5" />
          <ellipse cx="60" cy="106.4" rx="25" ry="2.8" fill="#7fa3ba" opacity="0.25" />
        </g>

        {/* neck */}
        <rect x="46" y="30" width="28" height="9" fill={`url(#neck-${uid})`} stroke="#3d4a57" strokeOpacity="0.25" strokeWidth="0.8" />

        {/* rubber stopper under cap */}
        <rect x="48" y="24" width="24" height="7" rx="2" fill="#4a4a4e" />
        <rect x="48" y="24" width="24" height="3" rx="1.5" fill="#63636a" />

        {/* aluminum crimp cap */}
        <rect x="42" y="14" width="36" height="16" rx="2" fill={`url(#cap-${uid})`} />
        <ellipse cx="60" cy="14.5" rx="18" ry="3.2" fill={`url(#capTop-${uid})`} />
        {/* red flip-off button */}
        <ellipse cx="60" cy="14.5" rx="9.5" ry="2.4" fill={`url(#flip-${uid})`} />
        <ellipse cx="57" cy="13.6" rx="3.4" ry="0.9" fill="#fff" opacity="0.4" />
        {/* crimp ridges */}
        {[44, 48, 52, 56, 60, 64, 68, 72].map((x) => (
          <rect key={x} x={x} y="20" width="1.1" height="9" fill="#000" opacity="0.16" />
        ))}
        {[44, 48, 52, 56, 60, 64, 68, 72].map((x) => (
          <rect key={`h${x}`} x={x + 1.1} y="20" width="0.7" height="9" fill="#fff" opacity="0.2" />
        ))}
        {/* crimp skirt over neck */}
        <path d="M43 30 L77 30 L75 38 L45 38 Z" fill={`url(#cap-${uid})`} />

        {/* Titan Elite label */}
        <g clipPath={`url(#bodyClip-${uid})`}>
          <rect x="34" y="56" width="52" height="48" fill={`url(#paper-${uid})`} />
          <line x1="34" y1="56" x2="86" y2="56" stroke="#000" strokeOpacity="0.2" strokeWidth="0.6" />
          <line x1="34" y1="104" x2="86" y2="104" stroke="#000" strokeOpacity="0.2" strokeWidth="0.6" />
          {/* blood-red brand bar */}
          <rect x="34" y="56" width="52" height="9.5" className="fill-blood" />
          {/* batch fine print */}
          <line x1="40" y1="98.5" x2="80" y2="98.5" stroke="#000" strokeOpacity="0.25" strokeWidth="0.5" />
          <line x1="44" y1="100.8" x2="76" y2="100.8" stroke="#000" strokeOpacity="0.15" strokeWidth="0.5" />
        </g>
        <text
          textAnchor="middle"
          className="fill-primary-foreground"
          style={{ fontFamily: "var(--font-display)", fontSize: "7px", letterSpacing: "0.14em" }}
        >
          <tspan x="60" y="63.4">TITAN ELITE</tspan>
        </text>
        <text
          textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize, fontWeight: 700, letterSpacing: "0.04em", fill: "#221d18" }}
        >
          {lines.map((l, i) => (
            <tspan key={l + i} x="60" y={nameStartY + i * lineHeight}>
              {l}
            </tspan>
          ))}
        </text>
        <text
          textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "4.6px", letterSpacing: "0.1em", fill: "#221d18", opacity: 0.7 }}
        >
          <tspan x="60" y="92.5">RESEARCH USE ONLY · 10MG</tspan>
        </text>

        {/* glass specular highlights */}
        <rect x="37.5" y="46" width="4" height="96" rx="2" fill="#fff" opacity="0.5" />
        <rect x="43" y="50" width="1.6" height="86" rx="0.8" fill="#fff" opacity="0.22" />
        <rect x="78.5" y="52" width="2.4" height="88" rx="1.2" fill="#fff" opacity="0.28" />
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
                <li key={s.url} className="text-sm text-muted-foreground flex items-start gap-2">
                  <FileText size={13} className="shrink-0 mt-0.5 text-blood" />
                  <span>{s.label}</span>
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
            <li key={s.url} className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <FileText size={13} className="text-blood" /> {s.label}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
