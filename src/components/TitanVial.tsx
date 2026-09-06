import vialMaster from "@/assets/titan-vial-master.png.asset.json";

/**
 * Titan Elite master product shot.
 *
 * One photographed vial (identical glass, cap, lighting, background, angle and
 * shadows) with the peptide-specific label text composited onto the blank
 * label plate. Rendered 1:1 square for product cards and detail pages.
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
  const long = display.length > 9;
  const veryLong = display.length > 13;

  return (
    <div className={`relative aspect-square w-full overflow-hidden bg-white [container-type:inline-size] ${className}`}>
      {/* master photograph, cropped square around the centered vial */}
      <div className="absolute left-1/2 top-1/2 h-full w-[135.4%] -translate-x-1/2 -translate-y-1/2">
        <img
          src={vialMaster.url}
          alt={`Titan Elite ${name} ${strength} research vial`}
          className="h-full w-full object-cover select-none"
          draggable={false}
          loading="lazy"
        />

        {/* label text plate — positioned over the blank label of the photograph */}
        <div
          aria-hidden
          className="absolute text-center text-[#111] [text-rendering:geometricPrecision]"
          style={{
            left: "38.6%",
            width: "22.6%",
            top: "57.5%",
            transform: "rotate(-0.4deg)",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          {/* compound name in the outlined box */}
          <div
            className="mx-auto flex items-center justify-center border border-[#c8102e]"
            style={{
              width: "88%",
              minHeight: "4.4cqw",
              padding: "0.6cqw 0.4cqw",
            }}
          >
            <span
              className="font-bold leading-[1.05] text-[#c8102e]"
              style={{
                fontSize: veryLong ? "2cqw" : long ? "2.7cqw" : "3.7cqw",
                letterSpacing: "-0.01em",
                wordBreak: "break-word",
              }}
            >
              {display}
            </span>
          </div>

          <div
            className="mt-[0.6cqw] font-medium text-[#333]"
            style={{ fontSize: "1.7cqw", letterSpacing: "0.08em" }}
          >
            PEPTIDE
          </div>

          {/* strength badge */}
          <div
            className="mx-auto mt-[1cqw] bg-[#c8102e] font-bold text-white"
            style={{ width: "52%", padding: "0.5cqw 0", fontSize: "3.3cqw", letterSpacing: "0.02em" }}
          >
            {strength}
          </div>

          <div
            className="mt-[1cqw] font-semibold leading-[1.35] text-[#1a1a1a]"
            style={{ fontSize: "1.35cqw", letterSpacing: "0.01em" }}
          >
            FOR RESEARCH USE ONLY
            <br />
            NOT FOR HUMAN CONSUMPTION
          </div>
        </div>

        {/* lot number inside the bottom red band */}
        <div
          aria-hidden
          className="absolute text-center font-semibold text-white"
          style={{
            left: "38.6%",
            width: "22.6%",
            top: "82.4%",
            fontSize: "1.5cqw",
            letterSpacing: "0.04em",
            transform: "rotate(-0.4deg)",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          LOT: {lot}
        </div>
      </div>
    </div>
  );
}
