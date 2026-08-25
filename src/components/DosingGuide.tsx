import { useMemo, useState } from "react";
import { Search, ChevronDown, Syringe, CalendarClock, Target, Microscope } from "lucide-react";
import { DOSING_GUIDE, DOSING_CATEGORIES, DOSING_COMPLIANCE } from "@/lib/dosing-guide";

export default function DosingGuide() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [open, setOpen] = useState<string | null>(DOSING_GUIDE[0]?.name ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DOSING_GUIDE.filter((d) => {
      if (category !== "All" && d.category !== category) return false;
      if (!q) return true;
      return [d.name, d.whatItIs, d.category, ...d.focus, ...d.dose, ...d.schedule]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [query, category]);

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-3xl sm:text-5xl">Dosing Guide</h3>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
          Typical research dosing ranges, escalation steps, and schedules for {DOSING_GUIDE.length} compounds — plus
          mechanism of action and what researchers observe over time. Educational reference only, research use only.
        </p>
      </div>

      <div className="relative w-full max-w-2xl mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dosing by compound, dose, or goal…"
          className="w-full bg-background border border-foreground/15 rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blood"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["All", ...DOSING_CATEGORIES].map((c) => (
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

      <div className="space-y-3">
        {filtered.map((d) => {
          const isOpen = open === d.name;
          return (
            <article key={d.name} className={`border transition ${isOpen ? "border-blood" : "border-foreground/10"}`}>
              <button
                onClick={() => setOpen(isOpen ? null : d.name)}
                className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="text-eyebrow block text-blood">{d.category}</span>
                  <span className="font-display text-xl sm:text-2xl block mt-1 truncate">{d.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground block mt-1">
                    {d.dose[0]}
                  </span>
                </span>
                <ChevronDown size={16} className={`shrink-0 transition ${isOpen ? "rotate-180 text-blood" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-foreground/10 p-4 sm:p-5 grid lg:grid-cols-2 gap-6">
                  <section className="space-y-5">
                    <div>
                      <h5 className="font-display text-lg mb-1.5">What it is</h5>
                      <p className="text-sm text-muted-foreground">{d.whatItIs}</p>
                    </div>

                    <div>
                      <h5 className="font-display text-lg mb-2 flex items-center gap-2">
                        <Syringe size={15} className="text-blood" /> Typical research dosing
                      </h5>
                      <ul className="border border-foreground/10 divide-y divide-foreground/10">
                        {d.dose.map((x) => (
                          <li key={x} className="text-sm px-3 py-2">
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-display text-lg mb-2 flex items-center gap-2">
                        <CalendarClock size={15} className="text-blood" /> Schedule
                      </h5>
                      <ul className="space-y-1.5">
                        {d.schedule.map((x) => (
                          <li key={x} className="text-sm flex gap-2">
                            <span className="text-blood font-mono text-[10px] pt-1">■</span>
                            <span>{x}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className="space-y-5">
                    <div>
                      <h5 className="font-display text-lg mb-2 flex items-center gap-2">
                        <Microscope size={15} className="text-blood" /> Mechanism of action
                      </h5>
                      <ul className="space-y-1.5">
                        {d.mechanism.map((x) => (
                          <li key={x} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-blood font-mono text-[10px] pt-1">■</span>
                            <span>{x}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-display text-lg mb-2 flex items-center gap-2">
                        <Target size={15} className="text-blood" /> Research focus
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {d.focus.map((f) => (
                          <span
                            key={f}
                            className="font-mono text-[10px] uppercase tracking-[0.14em] border border-foreground/15 px-2.5 py-1"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-display text-lg mb-1.5">Key observations</h5>
                      <p className="text-sm text-muted-foreground">{d.observations}</p>
                    </div>
                  </section>
                </div>
              )}
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="border border-foreground/10 p-6 text-sm text-muted-foreground text-center">
            No compounds found matching “{query}”.
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-foreground/10 pt-5">
        <p className="text-eyebrow">Compliance notice</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{DOSING_COMPLIANCE}</p>
      </div>
    </div>
  );
}
