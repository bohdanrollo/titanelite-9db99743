import vialMaster from "@/assets/peplog-vial-blank.png";

/**
 * PepLog master product shot.
 *
 * One photographed PepLog vial with peptide-specific information composited
 * onto its blank label. Rendered 1:1 for product cards and detail pages.
 */
export default function TitanVial({
  name,
  strength,
  lot,
  className = "",
}: {
  name: string;
  strength: string;
  lot: string;
  className?: string;
}) {
  const display = name.toUpperCase();
  const compact = display.length > 19;
  const long = display.length > 12;

  return (
    <div className={`relative aspect-square w-full overflow-hidden bg-bone [container-type:inline-size] ${className}`}>
      <div className="absolute inset-0">
        <img
          src={vialMaster}
          alt={`PepLog ${name} ${strength} research vial`}
          className="h-full w-full object-cover select-none"
          draggable={false}
          loading="lazy"
        />

        <div
          aria-hidden
          className="absolute flex flex-col items-center text-center text-bone [text-rendering:geometricPrecision]"
          style={{
            left: "34.1%",
            width: "31.8%",
            top: "52.4%",
            height: "25.2%",
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
          }}
        >
          <div className="flex min-h-[8.2cqw] w-[91%] items-center justify-center border-y border-primary/70 px-[1cqw] py-[0.8cqw]">
            <span
              className="font-semibold uppercase leading-[1.06] text-primary"
              style={{
                fontSize: compact ? "2.35cqw" : long ? "2.8cqw" : "3.5cqw",
                letterSpacing: "0",
                overflowWrap: "anywhere",
              }}
            >
              {display}
            </span>
          </div>

          <div
            className="mt-[0.9cqw] max-w-[90%] truncate font-mono uppercase text-bone/65"
            style={{ fontSize: "1.25cqw", letterSpacing: "0.08em" }}
          >
            {name === "Bacteriostatic Water" ? "Research supply" : "Peptide · Research compound"}
          </div>

          <div
            className="mt-[1.2cqw] border border-primary bg-primary/10 px-[2.4cqw] py-[0.45cqw] font-mono font-bold text-primary"
            style={{ fontSize: "2.5cqw", letterSpacing: "0.04em" }}
          >
            {strength}
          </div>

          <div
            className="mt-[1.2cqw] font-mono font-medium uppercase leading-[1.35] text-bone/75"
            style={{ fontSize: "1.05cqw", letterSpacing: "0.05em" }}
          >
            FOR RESEARCH USE ONLY
            <br />
            NOT FOR HUMAN OR ANIMAL USE
          </div>

          <div
            className="mt-auto w-[91%] border-t border-primary/70 pt-[0.7cqw] font-mono text-bone/60"
            style={{ fontSize: "1cqw", letterSpacing: "0.08em" }}
          >
            LOT {lot}
          </div>
        </div>
      </div>
    </div>
  );
}
