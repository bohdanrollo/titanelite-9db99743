import { useState } from "react";

export function PeptideCalculator() {
  const [strength, setStrength] = useState<string>("5");
  const [strengthUnit, setStrengthUnit] = useState<"mg" | "mcg">("mg");
  const [dose, setDose] = useState<string>("250");
  const [doseUnit, setDoseUnit] = useState<"mcg" | "mg">("mcg");
  const [bac, setBac] = useState<string>("2");

  const strengthMg = (parseFloat(strength) || 0) * (strengthUnit === "mg" ? 1 : 0.001);
  const doseMg = (parseFloat(dose) || 0) * (doseUnit === "mg" ? 1 : 0.001);
  const bacMl = parseFloat(bac) || 0;

  const concentration = bacMl > 0 ? strengthMg / bacMl : 0; // mg per mL
  const volumeMl = concentration > 0 ? doseMg / concentration : 0;
  const units = volumeMl * 100; // 100 unit = 1 mL syringe
  const valid = strengthMg > 0 && doseMg > 0 && bacMl > 0 && units > 0 && units <= 100;
  const overfill = units > 100;

  // Syringe visualization dimensions
  const barrelWidth = 320;
  const clampedUnits = Math.max(0, Math.min(100, units));
  const fillWidth = (clampedUnits / 100) * barrelWidth;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="border border-foreground/15 bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Peptide Dose Calculator</h2>
        <p className="text-sm text-muted-foreground mt-2">
          For research reference only. Verify all calculations independently before use.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-eyebrow block mb-2">Vial Strength</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="flex-1 border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
                placeholder="5"
              />
              <select
                value={strengthUnit}
                onChange={(e) => setStrengthUnit(e.target.value as "mg" | "mcg")}
                className="border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total peptide contained in the vial.</p>
          </div>

          <div>
            <label className="text-eyebrow block mb-2">Desired Dose</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                className="flex-1 border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
                placeholder="250"
              />
              <select
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as "mcg" | "mg")}
                className="border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Works with decimal doses like 1.5 mg or 2.5 mcg.</p>
          </div>

          <div>
            <label className="text-eyebrow block mb-2">BAC Water Added (mL)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={bac}
              onChange={(e) => setBac(e.target.value)}
              className="w-full border border-foreground/20 bg-background px-3 py-2 font-mono text-sm"
              placeholder="2"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setBac(String(v))}
                  className="border border-foreground/20 px-2 py-1 font-mono text-[10px] uppercase tracking-widest hover:border-blood hover:text-blood"
                >
                  {v} mL
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-foreground/15 bg-card p-5 sm:p-6">
        <h3 className="font-display text-xl">Draw To</h3>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Units" value={valid ? units.toFixed(1) : "—"} accent />
          <Stat label="Volume" value={valid ? `${volumeMl.toFixed(3)} mL` : "—"} />
          <Stat label="Concentration" value={concentration > 0 ? `${concentration.toFixed(2)} mg/mL` : "—"} />
        </div>

        {overfill && (
          <div className="mt-4 border border-blood bg-blood/10 p-3 text-sm text-blood">
            Dose exceeds a single 1 mL / 100-unit syringe. Reduce dose, split injection, or use more BAC water.
          </div>
        )}

        <div className="mt-6">
          <div className="text-eyebrow mb-3">1 mL / 100 Unit Syringe</div>
          <svg viewBox="0 -6 440 96" className="w-full h-auto">
            {/* Plunger */}
            <rect x="0" y="30" width="20" height="30" fill="var(--color-foreground)" opacity="0.7" />
            <rect x="20" y="35" width="10" height="20" fill="var(--color-foreground)" opacity="0.5" />
            {/* Barrel */}
            <rect x="30" y="20" width={barrelWidth} height="50" fill="none" stroke="var(--color-foreground)" strokeWidth="1.5" />
            {/* Fill (dose) */}
            <rect x={30 + barrelWidth - fillWidth} y="22" width={fillWidth} height="46" fill="var(--color-blood)" opacity="0.85" />
            {/* Graduations: every 1 unit, longer every 5, numbered every 10 (as on a real U-100 syringe) */}
            {Array.from({ length: 101 }).map((_, i) => {
              const major = i % 10 === 0;
              const mid = i % 5 === 0;
              const x = 30 + (i / 100) * barrelWidth;
              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1="20"
                    x2={x}
                    y2={major ? 8 : mid ? 12 : 15}
                    stroke="var(--color-foreground)"
                    strokeWidth={major ? 1.2 : 0.6}
                    opacity={major ? 1 : mid ? 0.8 : 0.55}
                  />
                  {major && (
                    <text
                      x={x}
                      y="5"
                      fontSize="6"
                      textAnchor="middle"
                      fill="var(--color-foreground)"
                      fontFamily="monospace"
                    >
                      {100 - i}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Needle hub */}
            <rect x={30 + barrelWidth} y="35" width="14" height="20" fill="var(--color-foreground)" opacity="0.7" />
            {/* Needle */}
            <rect x={30 + barrelWidth + 14} y="43" width="60" height="4" fill="var(--color-foreground)" />
          </svg>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>100 U</span>
            <span className="text-blood">Fill to {valid ? units.toFixed(1) : "—"} U</span>
            <span>0 U</span>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Formula: concentration = vial strength ÷ BAC water. Volume = dose ÷ concentration. Units = volume × 100 (on a 1 mL / 100 U insulin syringe).
        </p>
      </div>
    </div>
  );
}

